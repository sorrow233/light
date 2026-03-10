import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
    INLINE_STATE_MAX_LENGTH,
    STATE_ENCODING_CHUNKED,
    STATE_ENCODING_INLINE,
    getStateChunkDocId,
    normalizeStateMeta,
    splitStateIntoChunks,
    uint8ArrayToBase64,
    base64ToUint8Array
} from './syncStateCodec';

const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

// 防抖时间：10秒（减少写入频率）
const PUSH_DEBOUNCE_MS = 10000;

// 最小推送间隔：30秒（即使有多次变更，也至少等待30秒）
const MIN_PUSH_INTERVAL_MS = 30000;

// 重试配置
const MAX_RETRY_COUNT = 5;
const INITIAL_RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 120000; // 2分钟

/**
 * SyncEngine v2 - 单文档同步版本
 * 
 * 核心优化：
 * 1. 使用单个文档存储完整状态，而非无限增长的 updates 子集合
 * 2. 监听单个文档而非整个集合，大幅减少读取次数
 * 3. 使用版本号防止并发冲突
 * 4. 更长的防抖时间减少写入次数
 * 5. 智能重试机制：指数退避 + 最大重试次数限制
 * 
 * 数据结构：
 * users/{userId}/rooms/{docId} -> {
 *   state?: base64(小体积),
 *   stateEncoding: inline-base64 | chunked-base64,
 *   stateChunkCount: number,
 *   version: number,
 *   updatedAt: timestamp,
 *   sessionId: string
 * }
 * users/{userId}/rooms/__chunk__{docId}__{index} -> { value: base64Chunk, index, version, updatedAt }
 */
export class SyncEngine {
    constructor(docId, userId, initialData = {}) {
        this.docId = docId;
        this.userId = userId;
        this.initialData = initialData;
        this.sessionId = SESSION_ID;

        this.status = 'disconnected';
        this.pendingCount = 0;
        this.listeners = new Set();

        this.doc = new Y.Doc();

        this.isPushing = false;
        this.isDirty = false;
        this.isReady = false;
        this.isIndexedDBLoaded = false;
        this.isServerLoaded = false;
        this.unsubscribes = [];
        this.pushTimeout = null;

        // 版本控制
        this.localVersion = 0;
        this.remoteVersion = 0;
        this.lastAppliedRemoteVersion = 0;

        // 推送节流
        this.lastPushTime = 0;

        // 防止处理自己的更新
        this.lastPushedSessionId = null;

        // 重试控制
        this.retryCount = 0;
        this.hasPermissionError = false;

        this.init();
    }

    init() {
        console.info(`[SyncEngine] Init: ${this.docId}`);

        this.localProvider = new IndexeddbPersistence(this.docId, this.doc);
        this.localProvider.on('synced', () => {
            console.info(`[SyncEngine] IndexedDB synced.`);
            this.isIndexedDBLoaded = true;
            this.seedData();
            this.tryReady();
        });

        window.addEventListener('online', () => {
            if (this.isReady && this.isDirty) this.schedulePush();
        });

        if (this.userId) {
            this.connectFirestore();
        } else {
            this.setStatus('offline');
            this.isServerLoaded = true;
            this.tryReady();
        }

        // Track local changes
        this.doc.on('update', (update, origin) => {
            if (origin === 'remote') return;

            this.isDirty = true;
            if (!this.userId || this.hasPermissionError) {
                this.setStatus('offline');
                return;
            }

            if (!this.isReady) return;

            this.setStatus('syncing');
            this.schedulePush();
        });
    }

    getStateDocRef() {
        return doc(db, `users/${this.userId}/rooms`, this.docId);
    }

    getStateChunkDocRef(index) {
        return doc(db, `users/${this.userId}/rooms`, getStateChunkDocId(this.docId, index));
    }

    markServerLoaded() {
        if (!this.isServerLoaded) {
            this.isServerLoaded = true;
            console.info("[SyncEngine] Server loaded.");
            this.tryReady();
        }
    }

    async loadStateBase64(data, getChunkByIndex) {
        const { encoding, chunkCount } = normalizeStateMeta(data);

        if (encoding !== STATE_ENCODING_CHUNKED) {
            return typeof data.state === 'string' ? data.state : '';
        }

        if (chunkCount <= 0) {
            return '';
        }

        const chunkSnapshots = await Promise.all(
            Array.from({ length: chunkCount }, (_, index) => getChunkByIndex(index))
        );

        return chunkSnapshots.map((chunkSnapshot, index) => {
            if (!chunkSnapshot.exists()) {
                throw new Error(`Missing sync state chunk ${index + 1}/${chunkCount}`);
            }

            const value = chunkSnapshot.data()?.value;
            if (typeof value !== 'string') {
                throw new Error(`Invalid sync state chunk payload at ${index + 1}/${chunkCount}`);
            }

            return value;
        }).join('');
    }

    applyRemoteBase64State(base64State, version) {
        if (!base64State || typeof base64State !== 'string') {
            return;
        }

        const remoteState = base64ToUint8Array(base64State);
        if (remoteState.byteLength === 0) {
            return;
        }

        Y.applyUpdate(this.doc, remoteState, 'remote');
        this.lastAppliedRemoteVersion = Math.max(this.lastAppliedRemoteVersion, version || 0);
        console.info(`[SyncEngine] Applied remote state, version: ${version || 0}`);
    }

    async handleRemoteSnapshot(snapshot) {
        if (!snapshot.exists()) {
            console.info("[SyncEngine] No remote state, starting fresh.");
            this.markServerLoaded();
            return;
        }

        const data = snapshot.data();
        const incomingVersion = Number.isInteger(data.version) ? data.version : 0;

        if (incomingVersion > this.remoteVersion) {
            this.remoteVersion = incomingVersion;
        }

        // 跳过自己刚刚推送的更新
        if (data.sessionId === this.sessionId && incomingVersion === this.localVersion) {
            console.info("[SyncEngine] Skipping own update.");
            this.markServerLoaded();
            return;
        }

        // 过滤掉已应用过的旧快照
        if (incomingVersion <= this.lastAppliedRemoteVersion && this.isServerLoaded) {
            return;
        }

        try {
            const base64State = await this.loadStateBase64(
                data,
                (index) => getDoc(this.getStateChunkDocRef(index))
            );

            // 等待期间若已有更新版本进入，忽略旧快照
            if (incomingVersion < this.remoteVersion) {
                this.markServerLoaded();
                return;
            }

            this.applyRemoteBase64State(base64State, incomingVersion);
        } catch (error) {
            console.error("[SyncEngine] Failed to apply remote state:", error);
        }

        // 成功接收数据，清除权限错误状态
        if (this.hasPermissionError) {
            console.info("[SyncEngine] Permission restored, resuming sync.");
            this.hasPermissionError = false;
            this.retryCount = 0;
            this.tryReady();
            // 如果有待推送的数据，立即调度推送
            if (this.isDirty) {
                this.schedulePush();
            }
        }

        this.markServerLoaded();
    }

    /**
     * 连接 Firestore - 监听单个文档而非集合
     * 注意：重复调用时会先取消旧监听，防止监听器累积
     */
    connectFirestore() {
        // 防止重复监听：先取消所有旧监听器
        this.unsubscribes.forEach(fn => fn());
        this.unsubscribes = [];

        // 重新连接云端时，重置 ready/server 标记，确保等待远端快照后再进入 synced。
        this.isServerLoaded = false;
        this.isReady = false;
        this.hasPermissionError = false;
        this.retryCount = 0;

        this.setStatus('syncing');

        // 单个文档路径，不再使用 updates 子集合
        const stateDocRef = this.getStateDocRef();

        const unsub = onSnapshot(stateDocRef, (snapshot) => {
            void this.handleRemoteSnapshot(snapshot);
        }, (error) => {
            const isPermissionError = error.code === 'permission-denied';

            if (isPermissionError) {
                console.warn("[SyncEngine] Firestore permission denied - waiting for auth.");
                this.hasPermissionError = true;
                // 权限错误时不立即进入 ready，等待权限恢复
                // 但仍然设置 isServerLoaded 以便本地数据可用
            } else {
                console.error("[SyncEngine] Firestore error:", error.code);
            }

            this.isServerLoaded = true;
            this.setStatus('offline');
            this.tryReady();
        });

        this.unsubscribes.push(unsub);
    }

    tryReady() {
        if (!this.isServerLoaded || !this.isIndexedDBLoaded) return;

        this.isReady = true;
        this.localVersion = this.remoteVersion;

        console.info("[SyncEngine] Ready!");

        if (!this.userId || this.hasPermissionError || !navigator.onLine) {
            this.setStatus('offline');
            return;
        }

        if (this.isDirty) {
            this.setStatus('syncing');
            this.schedulePush();
            return;
        }

        this.setStatus('synced');
    }

    /**
     * 智能防抖推送
     * - 基础防抖：10秒
     * - 最小间隔：30秒（防止频繁推送）
     * - 权限错误时跳过推送直到权限恢复
     */
    schedulePush() {
        clearTimeout(this.pushTimeout);

        // 如果处于权限错误状态，暂不调度推送
        if (this.hasPermissionError) {
            console.info("[SyncEngine] Skipping push - waiting for permission.");
            return;
        }

        // 如果已超过最大重试次数，暂停推送
        if (this.retryCount >= MAX_RETRY_COUNT) {
            console.warn(`[SyncEngine] Max retries (${MAX_RETRY_COUNT}) reached, pausing push.`);
            return;
        }

        const now = Date.now();
        const timeSinceLastPush = now - this.lastPushTime;

        // 计算下次推送的延迟时间
        let delay = PUSH_DEBOUNCE_MS;
        if (timeSinceLastPush < MIN_PUSH_INTERVAL_MS) {
            // 如果距离上次推送不足30秒，延长等待时间
            delay = Math.max(delay, MIN_PUSH_INTERVAL_MS - timeSinceLastPush);
        }

        // 如果是重试，使用指数退避
        if (this.retryCount > 0) {
            const backoffDelay = Math.min(
                INITIAL_RETRY_DELAY_MS * Math.pow(2, this.retryCount - 1),
                MAX_RETRY_DELAY_MS
            );
            delay = Math.max(delay, backoffDelay);
            console.info(`[SyncEngine] Retry ${this.retryCount}/${MAX_RETRY_COUNT}, delay: ${delay}ms`);
        }

        this.pushTimeout = setTimeout(() => this.tryPush(), delay);
    }

    /**
     * 使用事务推送：Read-Modify-Write 原子操作
     * 确保不会覆盖他人刚提交的更新
     */
    async tryPush() {
        if (this.isPushing || !navigator.onLine || !this.isDirty || !this.userId) {
            if (!this.userId || !navigator.onLine || this.hasPermissionError) {
                this.setStatus('offline');
            } else if (!this.isDirty) {
                this.setStatus('synced');
            }
            return;
        }

        this.isPushing = true;
        const stateDocRef = this.getStateDocRef();

        try {
            const committedVersion = await runTransaction(db, async (transaction) => {
                // 1. 读取远程最新状态
                const sfDoc = await transaction.get(stateDocRef);
                const previousMeta = sfDoc.exists() ? normalizeStateMeta(sfDoc.data()) : { encoding: STATE_ENCODING_INLINE, chunkCount: 0 };

                // 2. 如果远程有更新，先合并
                if (sfDoc.exists()) {
                    const data = sfDoc.data();
                    const remoteVersion = Number.isInteger(data.version) ? data.version : 0;

                    if (remoteVersion > this.localVersion) {
                        console.info(`[SyncEngine] Found newer remote version ${remoteVersion} during push.`);
                        this.remoteVersion = remoteVersion;

                        const remoteBase64State = await this.loadStateBase64(
                            data,
                            (index) => transaction.get(this.getStateChunkDocRef(index))
                        );

                        this.applyRemoteBase64State(remoteBase64State, remoteVersion);
                    }
                }

                // 3. 编码现在的完整状态 (包含了刚才合并的远程变更)
                const fullState = Y.encodeStateAsUpdate(this.doc);

                if (fullState.byteLength === 0) {
                    // 理论上不太可能，除非 reset
                    return this.remoteVersion;
                }

                // 4. 计算新版本号 (基于最新的 remoteVersion)
                const newVersion = this.remoteVersion + 1;

                const base64State = uint8ArrayToBase64(fullState);
                const chunks = splitStateIntoChunks(base64State);
                const useChunkedState = base64State.length > INLINE_STATE_MAX_LENGTH || chunks.length > 1;
                const chunkCount = useChunkedState ? chunks.length : 0;

                transaction.set(stateDocRef, {
                    ...(useChunkedState ? {} : { state: base64State }),
                    stateEncoding: useChunkedState ? STATE_ENCODING_CHUNKED : STATE_ENCODING_INLINE,
                    stateChunkCount: chunkCount,
                    version: newVersion,
                    updatedAt: serverTimestamp(),
                    userId: this.userId,
                    sessionId: this.sessionId
                });

                if (useChunkedState) {
                    chunks.forEach((chunk, index) => {
                        transaction.set(this.getStateChunkDocRef(index), {
                            value: chunk,
                            index,
                            version: newVersion,
                            updatedAt: serverTimestamp()
                        });
                    });
                }

                const previousChunkCount = previousMeta.encoding === STATE_ENCODING_CHUNKED
                    ? previousMeta.chunkCount
                    : 0;

                if (previousChunkCount > chunkCount) {
                    for (let index = chunkCount; index < previousChunkCount; index++) {
                        transaction.delete(this.getStateChunkDocRef(index));
                    }
                }

                // 更新事务内的临时状态，等事务成功后再应用到实例
                return newVersion;
            });

            console.info("[SyncEngine] Transaction Push success!");

            this.localVersion = committedVersion;
            this.remoteVersion = Math.max(this.remoteVersion, committedVersion);
            this.lastAppliedRemoteVersion = Math.max(this.lastAppliedRemoteVersion, committedVersion);
            this.isDirty = false;
            this.setStatus('synced');
            this.retryCount = 0;
            this.lastPushTime = Date.now();

        } catch (error) {
            const isPermissionError = error.code === 'permission-denied' ||
                error.message?.includes('permission');
            const isSizeLimitError = error.code === 'invalid-argument' &&
                (error.message?.includes('longer than') ||
                    error.message?.includes('1048487') ||
                    error.message?.includes('exceeds the maximum'));

            if (isPermissionError) {
                console.warn("[SyncEngine] Push permission denied - waiting for auth.");
                this.hasPermissionError = true;
                this.setStatus('offline');
            } else if (isSizeLimitError) {
                console.error("[SyncEngine] Push failed due to Firebase payload size limit (1MB):", error);
                this.setStatus('error');
                // Do not schedule retries on deterministic payload-limit errors.
            } else {
                console.error("[SyncEngine] Push failed:", error);
                this.retryCount++;
                this.setStatus('offline');
                this.schedulePush();
            }
        } finally {
            this.isPushing = false;
        }
    }

    seedData() {
        if (this.doc.getMap('data').keys().next().done && Object.keys(this.initialData).length > 0) {
            this.doc.transact(() => {
                const map = this.doc.getMap('data');
                Object.entries(this.initialData).forEach(([k, v]) => map.set(k, v));
            });
        }
    }

    setStatus(s) {
        if (this.status !== s) {
            this.status = s;
            this.pendingCount = s === 'syncing' ? 1 : 0;
            this.notifyListeners();
        }
    }

    getDoc() { return this.doc; }

    /**
     * 立即推送数据到云端（跳过防抖）
     * 用于需要即时同步的页面，如 Inspiration
     * 使用 requestAnimationFrame 确保 Y.js 更新已完成
     */
    immediateSync() {
        // 使用 requestAnimationFrame 确保 DOM 和 Y.js 更新都已完成
        requestAnimationFrame(() => {
            // 强制设置为脏状态并推送
            if (!this.userId || !navigator.onLine || this.hasPermissionError) {
                this.setStatus('offline');
                return;
            }

            // 取消已调度的防抖推送
            clearTimeout(this.pushTimeout);

            // 如果 Y.js 有任何待推送的变更，强制标记为脏
            const state = Y.encodeStateAsUpdate(this.doc);
            if (state.byteLength > 0) {
                this.isDirty = true;
                this.setStatus('syncing');
                this.tryPush();
            }
        });
    }

    getStatus() { return { status: this.status, pendingCount: this.pendingCount }; }

    subscribe(cb) {
        this.listeners.add(cb);
        cb(this.getStatus());
        return () => this.listeners.delete(cb);
    }

    notifyListeners() {
        const s = this.getStatus();
        this.listeners.forEach(cb => cb(s));
    }

    destroy() {
        this.unsubscribes.forEach(fn => fn());
        this.localProvider?.destroy();
        clearTimeout(this.pushTimeout);
        this.listeners.clear();
    }
}
