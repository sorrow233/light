import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSync } from '../features/sync/SyncContext';
import { useSyncedMap } from '../features/sync/useSyncStore';
import {
    ACCENT_THEME_OPTIONS,
    DEFAULT_ACCENT_THEME,
    getAccentThemeCssVariables,
    normalizeAccentTheme,
} from '../theme/accentTheme';

const ThemeContext = createContext();
const THEME_KEY = 'light_theme';
const THEME_OVERRIDE_KEY = 'light_theme_override';
const THEME_MANUAL_UNTIL_KEY = 'light_theme_manual_until';
const ACCENT_THEME_KEY = 'light_accent_theme';
const MANUAL_THEME_LOCK_MS = 5 * 60 * 60 * 1000;

// 获取系统主题偏好
const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

const parseTimestamp = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const isManualLockActive = (manualUntil) => manualUntil > Date.now();

const normalizeTheme = (value) => (value === 'dark' || value === 'light' ? value : null);

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

// 内部 Provider，需要在 SyncProvider 内使用
function ThemeProviderInner({ children }) {
    // 同步
    const { doc } = useSync();
    const { data: preferences, set } = useSyncedMap(doc, 'user_preferences');

    const getStoredAccentTheme = () => {
        if (typeof window === 'undefined') return DEFAULT_ACCENT_THEME;
        return normalizeAccentTheme(localStorage.getItem(ACCENT_THEME_KEY) || DEFAULT_ACCENT_THEME);
    };

    const getStoredManualUntil = () => {
        if (typeof window === 'undefined') return 0;
        return parseTimestamp(localStorage.getItem(THEME_MANUAL_UNTIL_KEY));
    };

    const [theme, setThemeState] = useState(() => {
        const savedTheme = normalizeTheme(localStorage.getItem(THEME_KEY));
        const hasOverride = localStorage.getItem(THEME_OVERRIDE_KEY) === 'true';
        const manualUntil = getStoredManualUntil();

        if (hasOverride && isManualLockActive(manualUntil) && savedTheme) {
            return savedTheme;
        }
        return savedTheme || getSystemTheme();
    });

    const [manualUntil, setManualUntilState] = useState(() => getStoredManualUntil());
    const [accentTheme, setAccentThemeState] = useState(() => getStoredAccentTheme());

    const applyTheme = (nextTheme, nextManualUntil = 0) => {
        localStorage.setItem(THEME_KEY, nextTheme);

        if (isManualLockActive(nextManualUntil)) {
            localStorage.setItem(THEME_OVERRIDE_KEY, 'true');
            localStorage.setItem(THEME_MANUAL_UNTIL_KEY, String(nextManualUntil));
            setManualUntilState(nextManualUntil);
        } else {
            localStorage.removeItem(THEME_OVERRIDE_KEY);
            localStorage.removeItem(THEME_MANUAL_UNTIL_KEY);
            setManualUntilState(0);
        }

        setThemeState(nextTheme);
    };

    const applyAccentTheme = (nextAccentTheme) => {
        const normalizedAccentTheme = normalizeAccentTheme(nextAccentTheme);
        localStorage.setItem(ACCENT_THEME_KEY, normalizedAccentTheme);
        setAccentThemeState(normalizedAccentTheme);
    };

    const syncThemeToCloud = (nextTheme, nextManualUntil = 0) => {
        if (!doc) return;

        const hasManualLock = isManualLockActive(nextManualUntil);
        set('theme', nextTheme);
        set('themeOverride', hasManualLock);
        set('themeManualUntil', hasManualLock ? nextManualUntil : 0);
    };

    const syncAccentThemeToCloud = (nextAccentTheme) => {
        if (!doc) return;
        set('accentTheme', normalizeAccentTheme(nextAccentTheme));
    };

    // 从云端同步主题设置
    useEffect(() => {
        if (!preferences) return;

        const syncedTheme = normalizeTheme(preferences.theme);
        const syncedOverride = preferences.themeOverride === true;
        const syncedManualUntil = parseTimestamp(preferences.themeManualUntil);
        const hasActiveManualLock = syncedOverride && isManualLockActive(syncedManualUntil);

        if (hasActiveManualLock) {
            applyTheme(syncedTheme || getSystemTheme(), syncedManualUntil);
            return;
        }

        // 手动锁定已过期，回到系统主题并同步，确保所有设备恢复跟随
        if (syncedOverride && !hasActiveManualLock) {
            const systemTheme = getSystemTheme();
            applyTheme(systemTheme, 0);
            syncThemeToCloud(systemTheme, 0);
            return;
        }

        // 跟随模式：优先使用云端主题以保证多设备一致
        const followTheme = syncedTheme || getSystemTheme();
        applyTheme(followTheme, 0);

        // 清理遗留字段（如旧数据没有 theme 或残留 manualUntil）
        if (!syncedTheme || syncedManualUntil > 0) {
            syncThemeToCloud(followTheme, 0);
        }
    }, [doc, preferences?.theme, preferences?.themeOverride, preferences?.themeManualUntil, set]);

    useEffect(() => {
        const storedAccentTheme = getStoredAccentTheme();

        if (!preferences) {
            applyAccentTheme(storedAccentTheme);
            return;
        }

        if (typeof preferences.accentTheme === 'string') {
            applyAccentTheme(preferences.accentTheme);
            return;
        }

        applyAccentTheme(storedAccentTheme);

        if (storedAccentTheme !== DEFAULT_ACCENT_THEME) {
            syncAccentThemeToCloud(storedAccentTheme);
        }
    }, [doc, preferences?.accentTheme, set]);

    // 手动锁定到期后自动恢复系统跟随
    useEffect(() => {
        if (!isManualLockActive(manualUntil)) return;

        const timeoutId = window.setTimeout(() => {
            const systemTheme = getSystemTheme();
            applyTheme(systemTheme, 0);
            syncThemeToCloud(systemTheme, 0);
        }, manualUntil - Date.now());

        return () => window.clearTimeout(timeoutId);
    }, [manualUntil, doc, set]);

    // 应用主题到 DOM
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem(THEME_KEY, theme);

        const accentThemeVars = getAccentThemeCssVariables(accentTheme, theme === 'dark');
        Object.entries(accentThemeVars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        root.dataset.accentTheme = accentTheme;
        localStorage.setItem(ACCENT_THEME_KEY, accentTheme);
    }, [accentTheme, theme]);

    // 监听系统主题变化
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleSystemThemeChange = (e) => {
            const newSystemTheme = e.matches ? 'dark' : 'light';
            const hasManualLock = isManualLockActive(parseTimestamp(localStorage.getItem(THEME_MANUAL_UNTIL_KEY)));
            if (hasManualLock) return;

            applyTheme(newSystemTheme, 0);
            syncThemeToCloud(newSystemTheme, 0);
        };

        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, [doc, set]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        const lockUntil = Date.now() + MANUAL_THEME_LOCK_MS;

        applyTheme(newTheme, lockUntil);
        syncThemeToCloud(newTheme, lockUntil);
    };

    const useSystemTheme = () => {
        const systemTheme = getSystemTheme();
        applyTheme(systemTheme, 0);
        syncThemeToCloud(systemTheme, 0);
    };

    const value = {
        isDark: theme === 'dark',
        theme,
        accentTheme,
        accentThemeOptions: ACCENT_THEME_OPTIONS,
        isManualThemeLocked: isManualLockActive(manualUntil),
        manualThemeLockUntil: manualUntil,
        toggleTheme,
        setTheme: (newTheme) => {
            const normalized = normalizeTheme(newTheme) || 'light';
            const lockUntil = Date.now() + MANUAL_THEME_LOCK_MS;
            applyTheme(normalized, lockUntil);
            syncThemeToCloud(normalized, lockUntil);
        },
        setAccentTheme: (nextAccentTheme) => {
            const normalizedAccentTheme = normalizeAccentTheme(nextAccentTheme);
            applyAccentTheme(normalizedAccentTheme);
            syncAccentThemeToCloud(normalizedAccentTheme);
        },
        useSystemTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

// 外层 Provider，保持向后兼容
export function ThemeProvider({ children }) {
    return <ThemeProviderInner>{children}</ThemeProviderInner>;
}

export default ThemeContext;
