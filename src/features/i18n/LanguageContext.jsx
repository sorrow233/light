import React, { createContext, useContext, useState, useEffect } from 'react';
import zh from './locales/zh';
import en from './locales/en';
import ja from './locales/ja';
import ko from './locales/ko';

const STORAGE_KEY = 'light_language';

// 可用语言
const locales = { zh, en, ja, ko };

// 默认语言
const DEFAULT_LANGUAGE = 'zh';

// 语言上下文
const LanguageContext = createContext(null);

/**
 * 检测用户浏览器语言
 * @returns {string} 语言代码 (zh | en | ja | ko)
 */
const detectLanguage = () => {
    // 1. 优先使用 localStorage 保存的语言偏好 (This logic is now moved to LanguageProvider)
    // const saved = localStorage.getItem(STORAGE_KEY);
    // if (saved && locales[saved]) {
    //     return saved;
    // }

    // 2. 检测浏览器语言
    const browserLang = navigator.language || navigator.userLanguage || '';

    // 中文优先匹配
    if (browserLang.startsWith('zh')) {
        return 'zh';
    }

    // 英文匹配
    if (browserLang.startsWith('en')) {
        return 'en';
    }

    // 日语匹配
    if (browserLang.startsWith('ja')) {
        return 'ja';
    }

    // 韩语匹配
    if (browserLang.startsWith('ko')) {
        return 'ko';
    }

    // 3. 默认返回中文
    return DEFAULT_LANGUAGE;
};

/**
 * 获取嵌套对象中的值
 * @param {object} obj - 对象
 * @param {string} path - 路径 (如 'navbar.inspiration')
 * @returns {string|undefined} 值（未找到时返回 undefined）
 */
const getNestedValue = (obj, path) => {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return undefined;
        }
    }

    return result;
};

/**
 * 语言提供者组件
 */
export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => detectLanguage());

    // 同步语言到 localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, language);
    }, [language]);

    // 切换语言
    const setLanguage = (lang) => {
        if (locales[lang]) {
            setLanguageState(lang);
        } else {
            console.warn(`[i18n] Unsupported language: ${lang}`);
        }
    };

    // 切换到下一个语言（循环切换：中 -> 英 -> 日 -> 韩 -> 中）
    const toggleLanguage = () => {
        setLanguageState(prev => {
            if (prev === 'zh') return 'en';
            if (prev === 'en') return 'ja';
            if (prev === 'ja') return 'ko';
            return 'zh';
        });
    };

    // 获取翻译
    const t = (key, fallback) => {
        const translations = locales[language];
        const value = getNestedValue(translations, key);

        // 有翻译直接返回
        if (value !== undefined) {
            return value;
        }

        // 未找到时优先使用 fallback，避免不必要的日志噪音
        if (fallback !== undefined) {
            return fallback;
        }

        console.warn(`[i18n] Missing translation: ${key}`);
        return key;
    };

    const value = {
        language,
        setLanguage,
        toggleLanguage,
        t,
        // 暴露当前语言资源（某些场景可能需要直接访问）
        translations: locales[language],
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

/**
 * 使用语言上下文的 Hook
 */
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

/**
 * 简化的翻译 Hook
 * @returns {{ t: function, language: string }}
 */
export const useTranslation = () => {
    const { t, language, toggleLanguage, setLanguage } = useLanguage();
    return { t, language, toggleLanguage, setLanguage };
};

export default LanguageContext;
