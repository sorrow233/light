import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { SyncEngine } from './SyncEngine';

// Re-export hooks for backward compatibility or cleaner imports
export { useSyncedMap } from './hooks/useSyncedMap';
export { useSyncedProjects } from './hooks/useSyncedProjects';
export { useDataMigration } from './hooks/useDataMigration';
export { useSyncedCategories } from './hooks/useSyncedCategories';

// Global Map to store SyncEngines (one per docId)
const engineMap = new Map();

export const useSyncStore = (docId, initialData = {}) => {
    const { user } = useAuth();
    const [status, setStatus] = useState('disconnected');
    const [pendingCount, setPendingCount] = useState(0);
    const [ready, setReady] = useState(false);
    const [syncedDoc, setSyncedDoc] = useState(null);

    useEffect(() => {
        if (!docId) return;

        // 1. Get or Create Engine
        let engine = engineMap.get(docId);
        if (!engine) {
            engine = new SyncEngine(docId, user?.uid, initialData);
            engineMap.set(docId, engine);
        } else {
            // Update user if changed (e.g. login/logout)
            if (user?.uid && engine.userId !== user.uid) {
                engine.userId = user.uid;
                engine.connectFirestore();
            }
        }

        setSyncedDoc(engine.getDoc());

        // 2. Subscribe to State Changes
        const unsubscribe = engine.subscribe((state) => {
            setStatus(state.status);
            setPendingCount(state.pendingCount);
            setReady(Boolean(state.ready));
        });

        return () => {
            unsubscribe();
            // Optional: destroy engine if no longer needed by any component?
            // For now, we keep it alive for cache.
        };

    }, [docId, user]);

    // Helper to update data
    const update = useCallback((field, value) => {
        if (!syncedDoc) return;
        syncedDoc.transact(() => {
            syncedDoc.getMap('data').set(field, value);
        });
    }, [syncedDoc]);

    // 获取当前引擎实例以调用 immediateSync
    const immediateSync = useCallback(() => {
        const engine = engineMap.get(docId);
        engine?.immediateSync();
    }, [docId]);

    return { doc: syncedDoc, status, ready, update, pendingCount, immediateSync };
};
