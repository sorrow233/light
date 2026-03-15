const THEME_COLOR_META_ID = 'theme-color-meta';

export function updateBrowserChromeColor(color) {
    if (typeof document === 'undefined' || !color) return;

    const root = document.documentElement;
    const themeColorMeta = document.getElementById(THEME_COLOR_META_ID)
        || document.querySelector('meta[name="theme-color"]');

    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', color);
    }

    root.style.backgroundColor = color;

    if (document.body) {
        document.body.style.backgroundColor = color;
    }
}

export default updateBrowserChromeColor;
