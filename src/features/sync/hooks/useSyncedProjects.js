import { useMemo, useEffect, useCallback, useSyncExternalStore } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getSyncedArrayStore } from './syncedArrayStore';

// --- CRDT Array Hook (for Projects) ---
export const useSyncedProjects = (doc, arrayName) => {
    const store = useMemo(() => {
        if (!doc) return null;
        return getSyncedArrayStore(doc, arrayName);
    }, [arrayName, doc]);

    useEffect(() => {
        if (!store) return undefined;
        return () => {
            store.release();
        };
    }, [store]);

    const snapshot = useSyncExternalStore(
        useCallback((listener) => {
            if (!store) return () => { };
            return store.subscribe(listener);
        }, [store]),
        useCallback(() => {
            if (!store) {
                return {
                    items: [],
                    canUndo: false,
                    canRedo: false,
                    lastChangeOrigin: null,
                    lastChangeMeta: null,
                };
            }

            return store.getSnapshot();
        }, [store]),
        () => ({
            items: [],
            canUndo: false,
            canRedo: false,
            lastChangeOrigin: null,
            lastChangeMeta: null,
        })
    );

    const addProject = useCallback((project) => {
        const projectData = {
            id: project.id || uuidv4(),
            createdAt: project.createdAt || Date.now(),
            ...project
        };
        store?.addItem(projectData);
    }, [store]);

    const addProjects = useCallback((projects = []) => {
        if (!Array.isArray(projects) || projects.length === 0) return;

        store?.addItems(
            projects.map((project) => ({
                id: project.id || uuidv4(),
                createdAt: project.createdAt || Date.now(),
                ...project,
            }))
        );
    }, [store]);

    const removeProject = useCallback((id) => {
        store?.removeItem(id);
    }, [store]);

    const updateProject = useCallback((id, updates) => {
        store?.updateItem(id, updates);
    }, [store]);

    const undo = useCallback(() => {
        store?.undo();
    }, [store]);

    const redo = useCallback(() => {
        store?.redo();
    }, [store]);

    return {
        projects: snapshot.items,
        addProject,
        addProjects,
        removeProject,
        updateProject,
        undo,
        redo,
        canUndo: snapshot.canUndo,
        canRedo: snapshot.canRedo,
        lastChangeOrigin: snapshot.lastChangeOrigin,
        lastChangeMeta: snapshot.lastChangeMeta,
    };
};

/**
 * Hook to migrate projects from multiple old arrays to a single unified array.
 * This should be used once at the app level.
 */
export const useProjectMigration = (doc, unifiedArrayName, oldArrayNames) => {
    useEffect(() => {
        if (!doc || !unifiedArrayName || !oldArrayNames) return;

        const unifiedArray = doc.getArray(unifiedArrayName);

        // Use a transaction for the entire migration
        doc.transact(() => {
            // Check if migration has already been done or if unified array has data
            // (We might want a more robust flag, but let's check old arrays content)

            oldArrayNames.forEach(oldName => {
                const oldArray = doc.getArray(oldName);
                if (oldArray.length === 0) return;

                console.info(`[Migration] Moving projects from ${oldName} to ${unifiedArrayName}...`);

                const items = oldArray.toArray();
                items.forEach(item => {
                    const data = item instanceof Y.Map ? item.toJSON() : item;

                    // Normalize data: ensure ID, add stage based on old name if missing
                    let stage = data.stage;
                    if (!stage) {
                        if (oldName === 'inspiration') stage = 'inspiration';
                        else if (oldName === 'pending_projects') stage = 'pending';
                        else if (oldName === 'primary_projects') {
                            // If subStage >= 6, it might be Advanced/Final, but usually 'primary_projects' stores primary.
                            // If it's already graduated, it should be in final_projects or have higher subStage.
                            stage = (data.subStage || 1) >= 6 ? 'final' : 'primary';
                        }
                        else if (oldName === 'final_projects') stage = 'final';
                    }

                    const normalized = {
                        ...data,
                        id: data.id || uuidv4(),
                        stage: stage || 'primary'
                    };

                    // Check for duplicates in unifiedArray before adding
                    const exists = unifiedArray.toArray().some(uItem => {
                        const uId = uItem instanceof Y.Map ? uItem.get('id') : uItem.id;
                        return uId === normalized.id;
                    });

                    if (!exists) {
                        const yMap = new Y.Map();
                        Object.entries(normalized).forEach(([k, v]) => yMap.set(k, v));
                        unifiedArray.push([yMap]);
                    }
                });

                // Clear old array to mark migration complete for this collection
                oldArray.delete(0, oldArray.length);
            });
        });
    }, [doc, unifiedArrayName, oldArrayNames]);
};
