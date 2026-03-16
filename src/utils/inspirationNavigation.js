const LAST_INSPIRATION_ROUTE_KEY = 'light:last-inspiration-route';

export const isCategoryRoute = (pathname = '') => (
    pathname === '/inspiration'
    || pathname.startsWith('/inspiration/c/')
);

export const rememberInspirationRoute = (pathname) => {
    if (!pathname || !isCategoryRoute(pathname)) return;
    window.localStorage.setItem(LAST_INSPIRATION_ROUTE_KEY, pathname);
};

export const getRememberedInspirationRoute = () => {
    const rememberedPath = window.localStorage.getItem(LAST_INSPIRATION_ROUTE_KEY);
    if (!rememberedPath || !isCategoryRoute(rememberedPath)) {
        return '/inspiration';
    }
    return rememberedPath;
};
