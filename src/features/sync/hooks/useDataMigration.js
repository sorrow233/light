import { useEffect } from 'react';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';

const MIGRATION_KEY = 'light_inspiration_migration_v1_completed';
const LEGACY_INSPIRATION_KEY = 'flowstudio_inspiration_ideas';

const normalizeIdea = (idea, fallbackStage = 'inspiration') => {
    if (!idea || typeof idea !== 'object') return null;

    return {
        ...idea,
        id: idea.id || uuidv4(),
        stage: idea.stage === 'archive' ? 'archive' : fallbackStage,
        timestamp: Number(idea.timestamp || idea.createdAt || Date.now()),
    };
};

const toYMap = (value) => {
    const yMap = new Y.Map();
    Object.entries(value).forEach(([key, itemValue]) => yMap.set(key, itemValue));
    return yMap;
};

export const useDataMigration = (doc) => {
    useEffect(() => {
        if (!doc) return;
        if (localStorage.getItem(MIGRATION_KEY) === 'true') return;

        const yIdeas = doc.getArray('inspiration_items');
        const existingIds = new Set(
            yIdeas.toJSON()
                .map((idea) => idea?.id)
                .filter(Boolean)
        );
        const collectedIdeas = [];

        const collectIdeas = (items = [], fallbackStage = 'inspiration') => {
            items.forEach((idea) => {
                const normalized = normalizeIdea(idea, fallbackStage);
                if (!normalized || existingIds.has(normalized.id)) return;
                existingIds.add(normalized.id);
                collectedIdeas.push(normalized);
            });
        };

        try {
            collectIdeas(doc.getArray('inspiration').toJSON(), 'inspiration');
        } catch (error) {
            console.warn('[Migration] Failed to read legacy inspiration array:', error);
        }

        try {
            const legacyProjects = doc.getArray('all_projects')
                .toJSON()
                .filter((idea) => !idea?.stage || idea.stage === 'inspiration' || idea.stage === 'archive');
            collectIdeas(legacyProjects, 'inspiration');
        } catch (error) {
            console.warn('[Migration] Failed to read legacy all_projects array:', error);
        }

        try {
            const localIdeas = localStorage.getItem(LEGACY_INSPIRATION_KEY);
            if (localIdeas) {
                const parsed = JSON.parse(localIdeas);
                if (Array.isArray(parsed)) {
                    collectIdeas(parsed, 'inspiration');
                }
            }
        } catch (error) {
            console.warn('[Migration] Failed to read legacy inspiration localStorage:', error);
        }

        if (collectedIdeas.length > 0) {
            doc.transact(() => {
                yIdeas.push(collectedIdeas.map(toYMap));
            });
            console.info(`[Migration] Migrated ${collectedIdeas.length} inspiration items into inspiration_items.`);
        }

        localStorage.setItem(MIGRATION_KEY, 'true');
    }, [doc]);
};
