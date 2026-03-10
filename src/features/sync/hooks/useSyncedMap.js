import { useState, useEffect, useCallback } from 'react';

// Hook to subscribe to Y.Map changes in React
// Now supports writing and custom map names
export const useSyncedMap = (doc, mapName = 'user_preferences') => {
    const [data, setData] = useState({});

    useEffect(() => {
        if (!doc) return;
        const map = doc.getMap(mapName);

        const handleChange = () => {
            setData(map.toJSON());
        };

        // Initial load
        handleChange();

        // Listen
        map.observeDeep(handleChange);
        return () => map.unobserveDeep(handleChange);
    }, [doc, mapName]);

    const set = useCallback((key, value) => {
        if (!doc) return;
        doc.transact(() => {
            const map = doc.getMap(mapName);
            map.set(key, value);
        });
    }, [doc, mapName]);

    return {
        data,
        set,
        // Helper to check if synced
        isSynced: !!doc
    };
};

// Backward compatibility alias if needed, but we should migrate usages
export const useYMap = (doc) => useSyncedMap(doc, 'data');
