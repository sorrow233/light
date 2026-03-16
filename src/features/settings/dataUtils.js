import * as Y from 'yjs';

const EXPORT_VERSION = '4.0';
const SENSITIVE_USER_PREFERENCE_KEYS = new Set([
    'imageUploadAccessToken',
    'imageUploadAccessOwnerId',
    'imageUploadAccessActivatedAt',
    'imageUploadAccessEnabled',
    'imageUploadAccessStateVersion',
]);

const toYMap = (value) => {
    const yMap = new Y.Map();
    Object.entries(value).forEach(([key, itemValue]) => yMap.set(key, itemValue));
    return yMap;
};

const clearYArray = (array) => {
    if (array.length > 0) {
        array.delete(0, array.length);
    }
};

const clearYMap = (map) => {
    const keys = [];
    map.forEach((_, key) => keys.push(key));
    keys.forEach((key) => map.delete(key));
};

const normalizeIdea = (idea, fallbackStage = 'inspiration') => {
    if (!idea || typeof idea !== 'object') return null;

    return {
        ...idea,
        id: idea.id || crypto.randomUUID(),
        stage: idea.stage === 'archive' ? 'archive' : fallbackStage,
        timestamp: Number(idea.timestamp || idea.createdAt || Date.now()),
    };
};

const extractLegacyIdeas = (data) => {
    const nextIdeas = [];

    if (Array.isArray(data?.inspirationItems)) {
        data.inspirationItems.forEach((idea) => {
            const normalized = normalizeIdea(idea, 'inspiration');
            if (normalized) nextIdeas.push(normalized);
        });
    }

    if (Array.isArray(data?.allProjects)) {
        data.allProjects
            .filter((idea) => !idea?.stage || idea.stage === 'inspiration' || idea.stage === 'archive')
            .forEach((idea) => {
                const normalized = normalizeIdea(idea, 'inspiration');
                if (normalized) nextIdeas.push(normalized);
            });
    }

    if (Array.isArray(data?.inspirations)) {
        data.inspirations.forEach((idea) => {
            const normalized = normalizeIdea(idea, 'inspiration');
            if (normalized) nextIdeas.push(normalized);
        });
    }

    return nextIdeas;
};

const extractImportedCategories = (data) => {
    if (Array.isArray(data?.inspirationCategories)) {
        return data.inspirationCategories.filter((category) => category?.id);
    }

    if (Array.isArray(data?.categories)) {
        return data.categories.filter((category) => category?.id);
    }

    return [];
};

const sanitizeUserPreferencesForTransfer = (preferences) => {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(preferences).filter(([key]) => !SENSITIVE_USER_PREFERENCE_KEYS.has(key))
    );
};

const extractImportedPreferences = (data) => {
    if (data?.userPreferences && typeof data.userPreferences === 'object' && !Array.isArray(data.userPreferences)) {
        return sanitizeUserPreferencesForTransfer(data.userPreferences);
    }

    return {};
};

const clearLegacyCollections = (doc) => {
    [
        'all_projects',
        'all_commands',
        'command_categories',
        'writing_docs',
        'writing_folders',
        'inspiration',
        'pending_projects',
        'primary_projects',
        'final_projects',
    ].forEach((key) => clearYArray(doc.getArray(key)));

    ['writing_content'].forEach((key) => clearYMap(doc.getMap(key)));
};

export const exportAllData = (doc) => {
    const data = {
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
            inspirationItems: [],
            inspirationCategories: [],
            userPreferences: {},
        }
    };

    if (!doc) return data;

    try {
        const inspirationItems = doc.getArray('inspiration_items').toJSON();
        data.data.inspirationItems = inspirationItems;
    } catch (error) {
        console.warn('[Export] Failed to export inspiration_items:', error);
    }

    if (data.data.inspirationItems.length === 0) {
        try {
            const legacyIdeas = doc.getArray('all_projects')
                .toJSON()
                .filter((idea) => !idea?.stage || idea.stage === 'inspiration' || idea.stage === 'archive');
            data.data.inspirationItems = legacyIdeas;
        } catch (error) {
            console.warn('[Export] Failed to export legacy all_projects:', error);
        }
    }

    try {
        data.data.inspirationCategories = doc.getArray('inspiration_categories').toJSON();
    } catch (error) {
        console.warn('[Export] Failed to export inspiration_categories:', error);
    }

    try {
        data.data.userPreferences = sanitizeUserPreferencesForTransfer(doc.getMap('user_preferences').toJSON());
    } catch (error) {
        console.warn('[Export] Failed to export user_preferences:', error);
    }

    return data;
};

export const validateImportData = (payload) => {
    const errors = [];

    if (!payload || typeof payload !== 'object') {
        errors.push('数据格式无效：不是合法的 JSON 对象');
        return { valid: false, errors };
    }

    if (!payload.version) {
        errors.push('缺少版本号');
    }

    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
        errors.push('缺少 data 字段');
        return { valid: false, errors };
    }

    const {
        inspirationItems,
        inspirationCategories,
        userPreferences,
        allProjects,
        inspirations,
    } = payload.data;

    if (inspirationItems !== undefined && !Array.isArray(inspirationItems)) {
        errors.push('inspirationItems 必须是数组');
    }

    if (inspirationCategories !== undefined && !Array.isArray(inspirationCategories)) {
        errors.push('inspirationCategories 必须是数组');
    }

    if (userPreferences !== undefined && (typeof userPreferences !== 'object' || Array.isArray(userPreferences))) {
        errors.push('userPreferences 必须是对象');
    }

    if (allProjects !== undefined && !Array.isArray(allProjects)) {
        errors.push('allProjects 必须是数组');
    }

    if (inspirations !== undefined && !Array.isArray(inspirations)) {
        errors.push('inspirations 必须是数组');
    }

    const hasSupportedPayload = [
        Array.isArray(inspirationItems) && inspirationItems.length > 0,
        Array.isArray(inspirationCategories) && inspirationCategories.length > 0,
        sanitizeUserPreferencesForTransfer(userPreferences) && Object.keys(sanitizeUserPreferencesForTransfer(userPreferences)).length > 0,
        Array.isArray(allProjects) && allProjects.length > 0,
        Array.isArray(inspirations) && inspirations.length > 0,
    ].some(Boolean);

    if (!hasSupportedPayload) {
        errors.push('导入文件里没有可用的灵感或设置数据');
    }

    return { valid: errors.length === 0, errors };
};

export const importData = (doc, payload, mode = 'merge') => {
    if (!doc) {
        throw new Error('当前同步文档未就绪');
    }

    const source = payload?.data || {};
    const importedIdeas = extractLegacyIdeas(source);
    const importedCategories = extractImportedCategories(source);
    const importedPreferences = extractImportedPreferences(source);

    doc.transact(() => {
        const yIdeas = doc.getArray('inspiration_items');
        const yCategories = doc.getArray('inspiration_categories');
        const yPreferences = doc.getMap('user_preferences');

        if (mode === 'replace') {
            clearYArray(yIdeas);
            clearYArray(yCategories);
            clearYMap(yPreferences);
            clearLegacyCollections(doc);
        }

        if (importedIdeas.length > 0) {
            const existingIds = new Set(yIdeas.toJSON().map((idea) => idea?.id).filter(Boolean));
            const nextIdeas = importedIdeas.filter((idea) => !existingIds.has(idea.id));
            if (nextIdeas.length > 0) {
                yIdeas.push(nextIdeas.map(toYMap));
            }
        }

        if (importedCategories.length > 0) {
            const existingIds = new Set(yCategories.toJSON().map((category) => category?.id).filter(Boolean));
            const nextCategories = importedCategories.filter((category) => !existingIds.has(category.id));
            if (nextCategories.length > 0) {
                yCategories.push(nextCategories.map(toYMap));
            }
        }

        Object.entries(importedPreferences).forEach(([key, value]) => {
            yPreferences.set(key, value);
        });
    });
};

export const downloadAsJson = (data, filename = 'light-backup.json') => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

export const readJsonFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                resolve(JSON.parse(event.target.result));
            } catch {
                reject(new Error('无法解析 JSON 文件'));
            }
        };
        reader.onerror = () => reject(new Error('读取文件失败'));
        reader.readAsText(file);
    });
};
