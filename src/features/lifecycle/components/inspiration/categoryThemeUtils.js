const COLOR_HEX_MAP = {
    'pink-400': '#f472b6',
    'blue-400': '#60a5fa',
    'violet-400': '#a78bfa',
    'emerald-400': '#34d399',
    'amber-400': '#fbbf24',
    'rose-400': '#fb7185',
    'cyan-400': '#22d3ee',
    'orange-400': '#fb923c',
    'teal-400': '#2dd4bf',
    'indigo-400': '#818cf8',
    'sky-400': '#38bdf8',
    'red-400': '#f87171',
    'green-400': '#4ade80',
    'purple-400': '#c084fc',
    'gray-400': '#9ca3af',
    'stone-400': '#a8a29e',
};

const DEFAULT_ACCENT_HEX = '#f472b6';

const extractHexFromToken = (token) => {
    if (!token) return null;

    const directHexMatch = token.match(/^(?:bg|text)-\[(#[0-9a-fA-F]{6})\]$/);
    if (directHexMatch) return directHexMatch[1];

    const paletteMatch = token.match(/^(?:bg|text)-([a-z]+-\d{3})$/);
    if (!paletteMatch) return null;

    return COLOR_HEX_MAP[paletteMatch[1]] || null;
};

export const resolveCategoryAccentHex = (category) => {
    if (!category) return DEFAULT_ACCENT_HEX;

    const sources = [category.color, category.dotColor, category.textColor]
        .filter(Boolean)
        .flatMap((value) => String(value).split(/\s+/).filter(Boolean));

    for (const token of sources) {
        const hex = extractHexFromToken(token);
        if (hex) return hex;
    }

    return DEFAULT_ACCENT_HEX;
};

export const hexToRgba = (hex, alpha = 1) => {
    if (!hex || typeof hex !== 'string') {
        return `rgba(244, 114, 182, ${alpha})`;
    }

    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) {
        return `rgba(244, 114, 182, ${alpha})`;
    }

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
