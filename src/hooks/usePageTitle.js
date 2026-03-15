import { useEffect } from 'react';

const APP_NAME = 'Light';

export const buildPageTitle = (pageLabel) => {
    const safeLabel = String(pageLabel || '').trim();
    return safeLabel ? `${safeLabel} | ${APP_NAME}` : APP_NAME;
};

export const usePageTitle = (pageTitle) => {
    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.title = buildPageTitle(pageTitle);
    }, [pageTitle]);
};

export default usePageTitle;
