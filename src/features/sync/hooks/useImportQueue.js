import { useEffect, useRef } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

/**
 * 处理待导入队列的 hook
 * 从 Firebase pending_imports 集合中读取待导入内容，创建 Inspiration 后删除
 * 
 * @param {string} userId - 当前登录用户 ID
 * @param {Function} addIdea - 添加 Inspiration 的函数
 * @param {number} ideasCount - 当前 ideas 数量（用于计算颜色）
 * @param {Function} getNextColorIndex - 获取下一个颜色索引的函数
 * @param {boolean} isReady - 同步引擎是否就绪
 */
export const useImportQueue = (userId, addIdea, ideasCount, getNextColorIndex, isReady) => {
    const processingIdsRef = useRef(new Set());
    const ideasCountRef = useRef(ideasCount);
    const getNextColorIndexRef = useRef(getNextColorIndex);

    useEffect(() => {
        ideasCountRef.current = ideasCount;
    }, [ideasCount]);

    useEffect(() => {
        getNextColorIndexRef.current = getNextColorIndex;
    }, [getNextColorIndex]);

    useEffect(() => {
        console.debug('[ImportQueue] Subscribing queue for user:', userId, 'Ready:', isReady);

        if (!userId || !addIdea || !isReady) {
            if (!userId) console.debug('[ImportQueue] Skipping: No userId provided');
            return undefined;
        }

        const pendingRef = collection(db, `users/${userId}/pending_imports`);
        const unsubscribe = onSnapshot(pendingRef, async (snapshot) => {
            if (snapshot.empty) {
                console.debug('[ImportQueue] No pending imports found.');
                return;
            }

            const docsToProcess = snapshot.docs.filter((docSnap) => !processingIdsRef.current.has(docSnap.id));

            if (docsToProcess.length === 0) {
                return;
            }

            docsToProcess.forEach((docSnap) => processingIdsRef.current.add(docSnap.id));
            console.info(`[ImportQueue] Found ${docsToProcess.length} pending imports! Processing...`);

            try {
                let colorOffset = 0;

                await Promise.all(docsToProcess.map(async (docSnap) => {
                    const data = docSnap.data();

                    if (data.text) {
                        const newIdea = {
                            id: uuidv4(),
                            content: data.text,
                            timestamp: data.createdAt || Date.now(),
                            colorIndex: getNextColorIndexRef.current(ideasCountRef.current + colorOffset),
                            stage: 'inspiration',
                            source: data.source || 'external',
                            tags: data.source === 'nexmap' ? ['NexMap'] : ['API']
                        };

                        addIdea(newIdea);
                        colorOffset++;
                        console.log(`[ImportQueue] Created inspiration from ${data.source || 'external'}`);
                    }

                    await deleteDoc(doc(db, `users/${userId}/pending_imports`, docSnap.id));
                }));

                console.log(`[ImportQueue] Processed and cleaned ${docsToProcess.length} imports`);
            } catch (error) {
                if (error.code === 'permission-denied') {
                    console.debug('[ImportQueue] No pending imports or permission denied');
                } else {
                    console.error('[ImportQueue] Error processing queue:', error);
                }
            } finally {
                docsToProcess.forEach((docSnap) => processingIdsRef.current.delete(docSnap.id));
            }
        }, (error) => {
            if (error.code === 'permission-denied') {
                console.debug('[ImportQueue] Queue subscription denied');
            } else {
                console.error('[ImportQueue] Queue subscription error:', error);
            }
        });

        return () => {
            unsubscribe();
            processingIdsRef.current.clear();
        };
    }, [userId, addIdea, isReady]);
};
