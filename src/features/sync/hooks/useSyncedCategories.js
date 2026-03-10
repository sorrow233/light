import { useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import { INSPIRATION_CATEGORIES } from '../../../utils/constants';

const normalizeLabel = (value) => String(value || '').trim().toLowerCase();

export const useSyncedCategories = (
    doc,
    arrayName = 'inspiration_categories',
    defaultCategories = INSPIRATION_CATEGORIES,
    options = {}
) => {
    const {
        initializeDefaults = true,
        cleanupDuplicates = true,
        ensureDefaultsPresent = false,
    } = options;
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        if (!doc) return;

        const yArray = doc.getArray(arrayName);
        const defaultLabelMap = new Map((defaultCategories || []).map((cat) => [cat.id, cat.label]));

        const isPreferred = (candidate, current) => {
            const id = candidate.id || current.id;
            const defaultLabel = normalizeLabel(defaultLabelMap.get(id));
            const candidateLabel = normalizeLabel(candidate.label);
            const currentLabel = normalizeLabel(current.label);

            const candidateIsCustom = candidateLabel && candidateLabel !== defaultLabel;
            const currentIsCustom = currentLabel && currentLabel !== defaultLabel;

            if (candidateIsCustom !== currentIsCustom) {
                return candidateIsCustom;
            }

            // 两者同级时优先保留后写入的项，降低旧脏数据覆盖概率。
            return true;
        };

        const dedupeCategories = () => {
            if (!cleanupDuplicates) return false;

            const arr = yArray.toArray();
            const keepById = new Map();
            const removeIndices = [];

            arr.forEach((item, index) => {
                const value = item instanceof Y.Map ? item.toJSON() : item;
                const id = value?.id;
                if (!id) return;

                const existing = keepById.get(id);
                if (!existing) {
                    keepById.set(id, { index, value });
                    return;
                }

                if (isPreferred(value, existing.value)) {
                    removeIndices.push(existing.index);
                    keepById.set(id, { index, value });
                } else {
                    removeIndices.push(index);
                }
            });

            if (removeIndices.length === 0) return false;

            doc.transact(() => {
                [...new Set(removeIndices)]
                    .sort((a, b) => b - a)
                    .forEach((index) => {
                        yArray.delete(index, 1);
                    });
            });

            return true;
        };

        const seedDefaultsIfNeeded = () => {
            if (!initializeDefaults) return false;
            if (yArray.length > 0) return false;

            doc.transact(() => {
                if (yArray.length > 0) return;
                (defaultCategories || []).forEach((cat) => {
                    const yMap = new Y.Map();
                    Object.entries(cat).forEach(([key, value]) => yMap.set(key, value));
                    yArray.push([yMap]);
                });
            });
            return true;
        };

        const ensureMissingDefaults = () => {
            if (!initializeDefaults || !ensureDefaultsPresent) return false;
            if (!Array.isArray(defaultCategories) || defaultCategories.length === 0) return false;

            const existingIds = new Set(
                yArray.toArray()
                    .map((item) => (item instanceof Y.Map ? item.get('id') : item?.id))
                    .filter(Boolean)
            );

            const missing = defaultCategories.filter((category) => category?.id && !existingIds.has(category.id));
            if (missing.length === 0) return false;

            doc.transact(() => {
                missing.forEach((category) => {
                    const yMap = new Y.Map();
                    Object.entries(category).forEach(([key, value]) => yMap.set(key, value));
                    yArray.push([yMap]);
                });
            });

            return true;
        };

        const handleChange = () => {
            const seeded = seedDefaultsIfNeeded();
            const ensured = ensureMissingDefaults();
            const deduped = dedupeCategories();
            if (seeded || ensured || deduped) return;
            setCategories(yArray.toJSON());
        };

        handleChange();
        yArray.observeDeep(handleChange);

        return () => {
            yArray.unobserveDeep(handleChange);
        };
    }, [arrayName, cleanupDuplicates, defaultCategories, doc, ensureDefaultsPresent, initializeDefaults]);

    const addCategory = useCallback((category) => {
        if (!doc) return;
        const yArray = doc.getArray(arrayName);

        // Validation: prevent duplicate IDs
        if (category.id) {
            const exists = yArray.toJSON().some(c => c.id === category.id);
            if (exists) return;
        }

        const yMap = new Y.Map();
        const newCat = {
            id: category.id || uuidv4(),
            label: category.label || 'New Category',
            color: category.color || 'bg-gray-400',
            dotColor: category.dotColor || 'bg-gray-400',
            textColor: category.textColor || 'text-gray-400',
            ...category
        };
        Object.entries(newCat).forEach(([k, v]) => yMap.set(k, v));
        yArray.push([yMap]);
    }, [doc, arrayName]);

    const updateCategory = useCallback((id, updates) => {
        if (!doc) return;
        doc.transact(() => {
            const yArray = doc.getArray(arrayName);
            const arr = yArray.toArray();
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                const itemId = item instanceof Y.Map ? item.get('id') : item.id;
                if (itemId === id) {
                    if (item instanceof Y.Map) {
                        Object.entries(updates).forEach(([k, v]) => item.set(k, v));
                    }
                    break;
                }
            }
        });
    }, [doc, arrayName]);

    const removeCategory = useCallback((id) => {
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

    return { categories, addCategory, updateCategory, removeCategory };
};
