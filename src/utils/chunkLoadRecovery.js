import React, { lazy } from 'react';

const CHUNK_RELOAD_STORAGE_KEY = 'light_chunk_reload_fingerprint';

export function isChunkLoadError(error) {
    const message = String(error?.message || error || '');

    return (
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed') ||
        /Loading chunk [\w-]+ failed/i.test(message)
    );
}

function getRecoveryFingerprint(buildId, contextName) {
    const currentPath = typeof window === 'undefined'
        ? 'server'
        : `${window.location.pathname}${window.location.search}`;

    return `${buildId || 'unknown'}::${contextName || 'unknown'}::${currentPath}`;
}

export function recoverFromChunkLoadError(error, options = {}) {
    if (typeof window === 'undefined' || !isChunkLoadError(error)) {
        return false;
    }

    const fingerprint = getRecoveryFingerprint(options.buildId, options.contextName);
    const lastFingerprint = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);

    if (lastFingerprint === fingerprint) {
        return false;
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, fingerprint);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('reload', Date.now().toString());

    window.location.replace(nextUrl.toString());
    return true;
}

export function installChunkLoadRecovery(buildId) {
    if (typeof window === 'undefined') return () => {};

    const handlePreloadError = (event) => {
        const handled = recoverFromChunkLoadError(event?.payload || event, {
            buildId,
            contextName: 'vite-preload',
        });

        if (handled && typeof event?.preventDefault === 'function') {
            event.preventDefault();
        }
    };

    window.addEventListener('vite:preloadError', handlePreloadError);
    return () => window.removeEventListener('vite:preloadError', handlePreloadError);
}

export function lazyWithRetry(importer, options = {}) {
    return lazy(() => (
        importer().catch((error) => {
            const handled = recoverFromChunkLoadError(error, {
                buildId: options.buildId,
                contextName: options.contextName || 'lazy-import',
            });

            if (handled) {
                return new Promise(() => {});
            }

            throw error;
        })
    ));
}
