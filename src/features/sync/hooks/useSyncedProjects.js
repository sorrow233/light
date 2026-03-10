import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';

// --- CRDT Array Hook (for Projects) ---
export const useSyncedProjects = (doc, arrayName) => {
    const [projects, setProjects] = useState([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [lastChangeOrigin, setLastChangeOrigin] = useState(null);
    const [lastChangeMeta, setLastChangeMeta] = useState(null);
    const undoManagerRef = useRef(null);

    useEffect(() => {
        if (!doc) return;

        const yArray = doc.getArray(arrayName);

        // Initialize UndoManager scoped to this specific array (and its children)
        const undoManager = new Y.UndoManager(yArray, {
            trackedOrigins: new Set([null, 'local']),
            ignoreRemoteOrigins: true
        });
        undoManagerRef.current = undoManager;

        const resolveChangedIds = (events = []) => {
            const ids = new Set();

            events.forEach((event) => {
                const target = event?.target;
                if (!target) return;

                if (target instanceof Y.Map) {
                    const directId = target.get('id');
                    if (directId) ids.add(directId);
                }

                const path = Array.isArray(event?.path) ? event.path : [];
                const pathMap = path.find((entry) => entry instanceof Y.Map);
                if (pathMap) {
                    const pathId = pathMap.get('id');
                    if (pathId) ids.add(pathId);
                }

                if (target instanceof Y.Array && event?.changes?.delta) {
                    event.changes.delta.forEach((deltaItem) => {
                        if (!Array.isArray(deltaItem.insert)) return;
                        deltaItem.insert.forEach((inserted) => {
                            if (inserted instanceof Y.Map) {
                                const insertedId = inserted.get('id');
                                if (insertedId) ids.add(insertedId);
                                return;
                            }
                            if (inserted && typeof inserted === 'object' && inserted.id) {
                                ids.add(inserted.id);
                            }
                        });
                    });
                }
            });

            return Array.from(ids);
        };

        const handleChange = (origin = null, changedIds = []) => {
            setProjects(yArray.toJSON());
            setLastChangeOrigin(origin);
            setLastChangeMeta({
                origin,
                changedIds,
                at: Date.now(),
                arrayName,
            });
        };

        const handleStackChange = () => {
            setCanUndo(undoManager.undoStack.length > 0);
            setCanRedo(undoManager.redoStack.length > 0);
        };

        handleChange('init', []);
        const observer = (_events, transaction) => {
            handleChange(transaction?.origin ?? null, resolveChangedIds(_events));
        };
        yArray.observeDeep(observer);
        undoManager.on('stack-item-added', handleStackChange);
        undoManager.on('stack-item-popped', handleStackChange);

        return () => {
            yArray.unobserveDeep(observer);
            undoManager.off('stack-item-added', handleStackChange);
            undoManager.off('stack-item-popped', handleStackChange);
            undoManager.destroy();
        };
    }, [doc, arrayName]);

    const addProject = useCallback((project) => {
        if (!doc) return;
        const yArray = doc.getArray(arrayName);

        const yMap = new Y.Map();
        const projectData = {
            id: project.id || uuidv4(),
            createdAt: project.createdAt || Date.now(),
            ...project
        };

        Object.entries(projectData).forEach(([key, value]) => {
            yMap.set(key, value);
        });

        yArray.insert(0, [yMap]);
    }, [doc, arrayName]);

    const removeProject = useCallback((id) => {
        if (!doc) return;
        doc.transact(() => {
            const yArray = doc.getArray(arrayName);
            const arr = yArray.toArray();
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                const itemId = item instanceof Y.Map ? item.get('id') : item.id;
                if (itemId === id) {
                    yArray.delete(i, 1);
                    break;
                }
            }
        });
    }, [doc, arrayName]);

    const updateProject = useCallback((id, updates) => {
        if (!doc) return;
        doc.transact(() => {
            const yArray = doc.getArray(arrayName);
            const arr = yArray.toArray();

            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                const itemId = item instanceof Y.Map ? item.get('id') : item.id;
                if (itemId === id) {
                    if (item instanceof Y.Map) {
                        // Granular update on Y.Map
                        Object.entries(updates).forEach(([key, value]) => {
                            item.set(key, value);
                        });
                    } else {
                        // Fallback for non-Y.Map items
                        const updated = { ...item, ...updates };
                        yArray.delete(i, 1);
                        yArray.insert(i, [updated]);
                    }
                    break;
                }
            }
        });
    }, [doc, arrayName]);

    const undo = useCallback(() => {
        undoManagerRef.current?.undo();
    }, []);

    const redo = useCallback(() => {
        undoManagerRef.current?.redo();
    }, []);

    return {
        projects,
        addProject,
        removeProject,
        updateProject,
        undo,
        redo,
        canUndo,
        canRedo,
        lastChangeOrigin,
        lastChangeMeta,
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
