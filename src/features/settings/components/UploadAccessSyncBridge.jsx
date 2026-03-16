import { useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useSync } from '../../sync/SyncContext';
import { useSyncedMap } from '../../sync/useSyncStore';
import {
    clearStoredUploadAccessState,
    normalizeUploadAccessState,
    persistUploadAccessState,
} from '../uploadAccessService';

const UploadAccessSyncBridge = () => {
    const { user } = useAuth();
    const { doc } = useSync();
    const { data: preferences } = useSyncedMap(doc, 'user_preferences');

    useEffect(() => {
        const accessState = normalizeUploadAccessState(preferences);

        if (!user?.uid) {
            clearStoredUploadAccessState();
            return;
        }

        if (!accessState.token || !accessState.ownerId) {
            clearStoredUploadAccessState();
            return;
        }

        if (accessState.ownerId !== user.uid) {
            clearStoredUploadAccessState();
            return;
        }

        persistUploadAccessState(accessState);
    }, [preferences, user?.uid]);

    return null;
};

export default UploadAccessSyncBridge;
