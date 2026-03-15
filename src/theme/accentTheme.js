export const DEFAULT_ACCENT_THEME = 'pink';

const ACCENT_THEME_MAP = {
    pink: {
        id: 'pink',
        label: '粉色',
        description: '柔和灵感',
        swatch: '#f472b6',
        colors: {
            50: '#fdf2f8',
            100: '#fce7f3',
            200: '#fbcfe8',
            300: '#f9a8d4',
            400: '#f472b6',
            500: '#ec4899',
            600: '#db2777',
            rgb: '244 114 182',
            pageTint: '#fdf2f8',
            pageTintDark: '#111827',
        },
    },
    sky: {
        id: 'sky',
        label: '蓝色',
        description: '现代清透',
        swatch: '#5b86ff',
        colors: {
            50: '#f4f7ff',
            100: '#eaf0ff',
            200: '#d9e4ff',
            300: '#b7cbff',
            400: '#89a9ff',
            500: '#5b86ff',
            600: '#456ee6',
            rgb: '91 134 255',
            pageTint: '#f5f8ff',
            pageTintDark: '#0f172a',
        },
    },
};

export const ACCENT_THEME_OPTIONS = Object.values(ACCENT_THEME_MAP).map(({ id, label, description, swatch }) => ({
    id,
    label,
    description,
    swatch,
}));

export function normalizeAccentTheme(value) {
    return ACCENT_THEME_MAP[value] ? value : DEFAULT_ACCENT_THEME;
}

export function getAccentThemeDefinition(themeId = DEFAULT_ACCENT_THEME) {
    return ACCENT_THEME_MAP[normalizeAccentTheme(themeId)];
}

export function getAccentThemeCssVariables(themeId = DEFAULT_ACCENT_THEME, isDark = false) {
    const { colors } = getAccentThemeDefinition(themeId);

    return {
        '--accent-50': colors[50],
        '--accent-100': colors[100],
        '--accent-200': colors[200],
        '--accent-300': colors[300],
        '--accent-400': colors[400],
        '--accent-500': colors[500],
        '--accent-600': colors[600],
        '--accent-rgb': colors.rgb,
        '--bg-secondary': isDark ? colors.pageTintDark : colors.pageTint,
        '--accent-soft-bg': isDark ? `rgb(${colors.rgb} / 0.18)` : `rgb(${colors.rgb} / 0.10)`,
        '--accent-soft-bg-strong': isDark ? `rgb(${colors.rgb} / 0.26)` : `rgb(${colors.rgb} / 0.16)`,
        '--accent-border': isDark ? `rgb(${colors.rgb} / 0.38)` : colors[200],
        '--accent-border-strong': isDark ? `rgb(${colors.rgb} / 0.56)` : colors[300],
        '--accent-spotlight': isDark ? `rgb(${colors.rgb} / 0.16)` : `rgb(${colors.rgb} / 0.12)`,
        '--accent-spotlight-strong': isDark ? `rgb(${colors.rgb} / 0.36)` : `rgb(${colors.rgb} / 0.28)`,
        '--accent-brush-from': isDark ? `rgb(${colors.rgb} / 0.42)` : colors[200],
        '--accent-brush-via': isDark ? `rgb(${colors.rgb} / 0.28)` : `rgb(${colors.rgb} / 0.46)`,
    };
}
