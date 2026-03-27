import { hexToRgba } from './categoryThemeUtils';

const DEFAULT_CODE_BLOCK_ACCENT = '#f472b6';
const MONO_FONT_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, "Courier New", monospace';

const resolveAccentHex = (accentHex) => accentHex || DEFAULT_CODE_BLOCK_ACCENT;

export const trimCodeBlockFenceContent = (text = '') => String(text || '')
    .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
    .replace(/```$/, '')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');

export const buildCodeBlockTheme = (accentHex) => {
    const resolvedAccentHex = resolveAccentHex(accentHex);
    const backgroundColor = hexToRgba(resolvedAccentHex, 0.08);
    const borderColor = hexToRgba(resolvedAccentHex, 0.36);
    const shadowColor = hexToRgba(resolvedAccentHex, 0.82);

    return {
        accentHex: resolvedAccentHex,
        toolbarButtonStyle: {
            borderColor,
            color: resolvedAccentHex,
            backgroundColor: hexToRgba(resolvedAccentHex, 0.08),
            boxShadow: `0 10px 18px -14px ${shadowColor}`,
        },
        editorBlockStyle: {
            display: 'block',
            margin: '0.35rem 0',
            padding: '0.55rem 0.8rem',
            borderRadius: '0.95rem',
            border: `1px solid ${borderColor}`,
            backgroundColor,
            color: resolvedAccentHex,
            lineHeight: '1.9',
            whiteSpace: 'pre-wrap',
            fontFamily: MONO_FONT_STACK,
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
        },
        renderedBlockStyle: {
            borderColor,
            backgroundColor,
            color: resolvedAccentHex,
            boxShadow: `inset 0 -1px 0 ${hexToRgba(resolvedAccentHex, 0.18)}, 0 18px 30px -24px ${shadowColor}`,
        },
    };
};
