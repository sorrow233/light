import * as Y from 'yjs';

const EMPTY_CHANGED_IDS = Object.freeze([]);

const cloneJsonValue = (value) => {
    if (value === null || value === undefined) return value;

    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }

    return JSON.parse(JSON.stringify(value));
};

const readSharedValue = (value) => {
    if (value instanceof Y.Text) {
        return value.toString();
    }

    if (value instanceof Y.AbstractType) {
        return value.toJSON();
    }

    if (Array.isArray(value)) {
        return cloneJsonValue(value);
    }

    if (value && typeof value === 'object') {
        return cloneJsonValue(value);
    }

    return value;
};

const readItemId = (value) => {
    if (value instanceof Y.Map) {
        return value.get('id') ?? null;
    }

    if (value && typeof value === 'object' && 'id' in value) {
        return value.id ?? null;
    }

    return null;
};

const buildIndexMap = (sources = []) => {
    const idToIndex = new Map();

    sources.forEach((source, index) => {
        const id = readItemId(source);
        if (id) {
            idToIndex.set(id, index);
        }
    });

    return idToIndex;
};

const createStateFromSources = ({
    sources = [],
    origin = 'init',
    changedIds = EMPTY_CHANGED_IDS,
    arrayName,
    canUndo = false,
    canRedo = false,
}) => {
    const items = sources.map(readSharedValue);

    return {
        sources,
        items,
        idToIndex: buildIndexMap(sources),
        canUndo,
        canRedo,
        lastChangeOrigin: origin,
        lastChangeMeta: {
            origin,
            changedIds,
            at: Date.now(),
            arrayName,
        },
    };
};

const applyArrayDelta = (sources = [], items = [], delta = []) => {
    const nextSources = [];
    const nextItems = [];
    let cursor = 0;

    delta.forEach((part) => {
        if (part.retain) {
            nextSources.push(...sources.slice(cursor, cursor + part.retain));
            nextItems.push(...items.slice(cursor, cursor + part.retain));
            cursor += part.retain;
        }

        if (part.delete) {
            cursor += part.delete;
        }

        if (Array.isArray(part.insert) && part.insert.length > 0) {
            part.insert.forEach((inserted) => {
                nextSources.push(inserted);
                nextItems.push(readSharedValue(inserted));
            });
        }
    });

    if (cursor < sources.length) {
        nextSources.push(...sources.slice(cursor));
        nextItems.push(...items.slice(cursor));
    }

    return {
        sources: nextSources,
        items: nextItems,
    };
};

const resolveChangedIds = (events = [], previousSources = [], observedArray = null) => {
    const ids = new Set();

    events.forEach((event) => {
        const target = event?.target;

        if (target instanceof Y.Map) {
            const directId = readItemId(target);
            if (directId) {
                ids.add(directId);
            }
        }

        const path = Array.isArray(event?.path) ? event.path : [];
        const topLevelIndex = path.find((entry) => typeof entry === 'number');
        if (typeof topLevelIndex === 'number') {
            const indexedId = readItemId(previousSources[topLevelIndex]);
            if (indexedId) {
                ids.add(indexedId);
            }
        }

        const pathMap = path.find((entry) => entry instanceof Y.Map);
        if (pathMap) {
            const pathId = readItemId(pathMap);
            if (pathId) {
                ids.add(pathId);
            }
        }

        if (target instanceof Y.Array && event?.changes?.delta && (!observedArray || target === observedArray)) {
            let cursor = 0;

            event.changes.delta.forEach((part) => {
                if (part.retain) {
                    cursor += part.retain;
                }

                if (part.delete) {
                    previousSources
                        .slice(cursor, cursor + part.delete)
                        .forEach((source) => {
                            const deletedId = readItemId(source);
                            if (deletedId) {
                                ids.add(deletedId);
                            }
                        });
                    cursor += part.delete;
                }

                if (Array.isArray(part.insert)) {
                    part.insert.forEach((inserted) => {
                        const insertedId = readItemId(inserted);
                        if (insertedId) {
                            ids.add(insertedId);
                        }
                    });
                }
            });
        }
    });

    return Array.from(ids);
};

class SyncedArrayStore {
    constructor(doc, arrayName, onDestroy) {
        this.doc = doc;
        this.arrayName = arrayName;
        this.onDestroy = onDestroy;
        this.yArray = doc.getArray(arrayName);
        this.listeners = new Set();
        this.refCount = 0;

        this.undoManager = new Y.UndoManager(this.yArray, {
            trackedOrigins: new Set([null, 'local']),
            ignoreRemoteOrigins: true,
        });

        this.state = createStateFromSources({
            sources: this.yArray.toArray(),
            origin: 'init',
            changedIds: EMPTY_CHANGED_IDS,
            arrayName: this.arrayName,
            canUndo: false,
            canRedo: false,
        });

        this.handleObserver = this.handleObserver.bind(this);
        this.handleStackChange = this.handleStackChange.bind(this);

        this.yArray.observeDeep(this.handleObserver);
        this.undoManager.on('stack-item-added', this.handleStackChange);
        this.undoManager.on('stack-item-popped', this.handleStackChange);
    }

    retain() {
        this.refCount += 1;
        return this;
    }

    release() {
        this.refCount -= 1;

        if (this.refCount <= 0) {
            this.destroy();
            this.onDestroy?.();
        }
    }

    destroy() {
        this.yArray.unobserveDeep(this.handleObserver);
        this.undoManager.off('stack-item-added', this.handleStackChange);
        this.undoManager.off('stack-item-popped', this.handleStackChange);
        this.undoManager.destroy();
        this.listeners.clear();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    notify() {
        this.listeners.forEach((listener) => listener());
    }

    getSnapshot() {
        return this.state;
    }

    updateState(partialState) {
        this.state = {
            ...this.state,
            ...partialState,
        };
        this.notify();
    }

    handleStackChange() {
        const nextCanUndo = this.undoManager.undoStack.length > 0;
        const nextCanRedo = this.undoManager.redoStack.length > 0;

        if (this.state.canUndo === nextCanUndo && this.state.canRedo === nextCanRedo) {
            return;
        }

        this.updateState({
            canUndo: nextCanUndo,
            canRedo: nextCanRedo,
        });
    }

    handleObserver(events = [], transaction = null) {
        const previousState = this.state;
        let nextSources = previousState.sources;
        let nextItems = previousState.items;
        let hasArrayShapeChange = false;

        events.forEach((event) => {
            if (event?.target !== this.yArray || !event?.changes?.delta) {
                return;
            }

            const deltaResult = applyArrayDelta(nextSources, nextItems, event.changes.delta);
            nextSources = deltaResult.sources;
            nextItems = deltaResult.items;
            hasArrayShapeChange = true;
        });

        const nextIdToIndex = hasArrayShapeChange ? buildIndexMap(nextSources) : previousState.idToIndex;
        const changedIds = resolveChangedIds(events, previousState.sources, this.yArray);

        if (changedIds.length > 0) {
            const mutableItems = hasArrayShapeChange ? [...nextItems] : [...previousState.items];
            let hasItemUpdate = hasArrayShapeChange;

            changedIds.forEach((changedId) => {
                const itemIndex = nextIdToIndex.get(changedId);
                if (itemIndex === undefined) {
                    return;
                }

                mutableItems[itemIndex] = readSharedValue(nextSources[itemIndex]);
                hasItemUpdate = true;
            });

            if (hasItemUpdate) {
                nextItems = mutableItems;
            }
        }

        this.updateState({
            sources: nextSources,
            items: nextItems,
            idToIndex: nextIdToIndex,
            canUndo: this.undoManager.undoStack.length > 0,
            canRedo: this.undoManager.redoStack.length > 0,
            lastChangeOrigin: transaction?.origin ?? null,
            lastChangeMeta: {
                origin: transaction?.origin ?? null,
                changedIds,
                at: Date.now(),
                arrayName: this.arrayName,
            },
        });
    }

    addItem(item) {
        const yMap = new Y.Map();
        Object.entries(item).forEach(([key, value]) => {
            yMap.set(key, value);
        });
        this.yArray.insert(0, [yMap]);
    }

    addItems(items = []) {
        if (!Array.isArray(items) || items.length === 0) {
            return;
        }

        const yMaps = items
            .map((item) => {
                const yMap = new Y.Map();
                Object.entries(item).forEach(([key, value]) => {
                    yMap.set(key, value);
                });
                return yMap;
            })
            .reverse();

        this.doc.transact(() => {
            this.yArray.insert(0, yMaps);
        });
    }

    removeItem(id) {
        const itemIndex = this.state.idToIndex.get(id);
        if (itemIndex === undefined) {
            return;
        }

        this.doc.transact(() => {
            this.yArray.delete(itemIndex, 1);
        });
    }

    updateItem(id, updates) {
        const itemIndex = this.state.idToIndex.get(id);
        if (itemIndex === undefined) {
            return;
        }

        const currentItem = this.state.sources[itemIndex];

        this.doc.transact(() => {
            if (currentItem instanceof Y.Map) {
                Object.entries(updates).forEach(([key, value]) => {
                    currentItem.set(key, value);
                });
                return;
            }

            const mergedItem = {
                ...(this.state.items[itemIndex] || {}),
                ...updates,
            };
            const yMap = new Y.Map();
            Object.entries(mergedItem).forEach(([key, value]) => {
                yMap.set(key, value);
            });
            this.yArray.delete(itemIndex, 1);
            this.yArray.insert(itemIndex, [yMap]);
        });
    }

    undo() {
        this.undoManager.undo();
    }

    redo() {
        this.undoManager.redo();
    }
}

const docStoreRegistry = new WeakMap();

const getDocStoreMap = (doc) => {
    let storeMap = docStoreRegistry.get(doc);

    if (!storeMap) {
        storeMap = new Map();
        docStoreRegistry.set(doc, storeMap);
    }

    return storeMap;
};

export const getSyncedArrayStore = (doc, arrayName) => {
    const storeMap = getDocStoreMap(doc);
    let store = storeMap.get(arrayName);

    if (!store) {
        store = new SyncedArrayStore(doc, arrayName, () => {
            storeMap.delete(arrayName);
            if (storeMap.size === 0) {
                docStoreRegistry.delete(doc);
            }
        });
        storeMap.set(arrayName, store);
    }

    return store.retain();
};
