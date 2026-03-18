import { useEffect, useRef } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

/**
 * 处理待导入队列的 hook
 * 从 Firebase pending_imports 集合中读取待导入内容，创建 Inspiration 后删除
 * 
 * @param {string} userId - 当前登录用户 ID
 * @param {Function} onImport - 处理导入内容的函数
 * @param {boolean} isReady - 同步引擎是否就绪
 */
export const useImportQueue = (userId, onImport, isReady) => {
    const processingIdsRef = useRef(new Set());

    useEffect(() => {
        console.debug('[ImportQueue] Subscribing queue for user:', userId, 'Ready:', isReady);

        if (!userId || !onImport || !isReady) {
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
                        onImport({
                            text: data.text,
                            timestamp: data.createdAt || Date.now(),
                            source: data.source || 'external',
                            order: colorOffset
                        });
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
    }, [userId, onImport, isReady]);
};
