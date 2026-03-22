const PROJECT_TAG_REGEX = /\[([^\]]+)\]/g;
const INTERNAL_PLACEHOLDER_TAG_PATTERNS = [
    /^INDEX_\d+$/i,
    /^INDEX_\d+(?:\s*,\s*INDEX_\d+)+$/i,
];

export const isVisibleProjectTag = (value = '') => {
    const normalized = String(value || '').trim();
    if (!normalized) return false;

    return !INTERNAL_PLACEHOLDER_TAG_PATTERNS.some((pattern) => pattern.test(normalized));
};

export const extractVisibleProjectTags = (value = '') => {
    const tags = [];
    const content = String(value || '');

    for (const match of content.matchAll(PROJECT_TAG_REGEX)) {
        const tag = String(match?.[1] || '').trim();
        if (isVisibleProjectTag(tag)) {
            tags.push(tag);
        }
    }

    return tags;
};
