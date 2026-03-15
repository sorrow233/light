const LANGUAGE_STORAGE_KEY = 'light_language';

function normalizeLanguageCode(language = '') {
    const normalized = String(language || '').trim().toLowerCase();

    if (normalized.startsWith('zh')) return 'zh-CN';
    if (normalized.startsWith('ja')) return 'ja';
    if (normalized.startsWith('ko')) return 'ko';
    if (normalized.startsWith('en')) return 'en';

    return 'en';
}

export function getPreferredAuthLanguageCode() {
    const savedLanguage = typeof window === 'undefined'
        ? ''
        : window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || '';
    const browserLanguage = typeof navigator === 'undefined'
        ? ''
        : navigator.language || navigator.userLanguage || '';

    return normalizeLanguageCode(savedLanguage || browserLanguage);
}

export function applyPreferredAuthLanguage(authInstance) {
    if (!authInstance) {
        return 'en';
    }

    const preferredLanguage = getPreferredAuthLanguageCode();
    authInstance.languageCode = preferredLanguage;

    return preferredLanguage;
}
