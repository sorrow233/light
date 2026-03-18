import React, { createContext, useContext } from 'react';
import { useSyncStore, useDataMigration } from './useSyncStore';
import { useLocalBackup } from './LocalBackupService';

const SyncContext = createContext(null);

export const SyncProvider = ({ children, docId = 'light_v1' }) => {
    const { doc, status, ready, update, immediateSync } = useSyncStore(docId);

    useDataMigration(doc);
    useLocalBackup(doc);

    return (
        <SyncContext.Provider value={{ doc, status, ready, update, immediateSync }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};
