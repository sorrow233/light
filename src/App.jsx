import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { KeymapProvider, ShortcutHelpModal, useBrowserIntercept } from './features/shortcuts';
import { LanguageProvider } from './features/i18n';
import { useIOSStandalone } from './hooks/useIOSStandalone';
import RouteLoadingScreen from './components/shared/RouteLoadingScreen';
import EmailLinkCompletionModal from './features/auth/EmailLinkCompletionModal';
import IOSAddToHomePrompt from './features/pwa/IOSAddToHomePrompt';
import UploadAccessSyncBridge from './features/settings/components/UploadAccessSyncBridge';
import { lazyWithRetry } from './utils/chunkLoadRecovery';
import { version } from '../package.json';

const createRouteModule = (importer, contextName) => lazyWithRetry(importer, {
    buildId: version,
    contextName,
});

const InspirationModule = createRouteModule(
    () => import('./features/lifecycle/InspirationModule'),
    'route-inspiration'
);
const InspirationArchiveModule = createRouteModule(
    () => import('./features/lifecycle/InspirationArchiveModule'),
    'route-inspiration-archive'
);
const DataCenterModule = createRouteModule(
    () => import('./features/lifecycle/DataCenterModule'),
    'route-data-center'
);
const ShareReceiver = createRouteModule(
    () => import('./features/share/ShareReceiver'),
    'route-share-receiver'
);

function App() {
    const location = useLocation();
    const { isIOSStandalone } = useIOSStandalone();
    const routeSectionKey = location.pathname.split('/')[1] || 'root';
    const isShareReceiverRoute = location.pathname === '/share-receiver';

    useBrowserIntercept();

    return (
        <LanguageProvider>
            <KeymapProvider>
                <div
                    className={`flex flex-col h-screen min-h-dvh h-dvh overflow-hidden ${isIOSStandalone ? 'ios-standalone' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                    <UploadAccessSyncBridge />
                    <Toaster position="top-right" richColors />
                    {!isShareReceiverRoute && <Navbar />}

                    <main className="flex-1 overflow-y-auto w-full no-scrollbar">
                        <div className={`${isShareReceiverRoute ? 'h-full' : 'max-w-7xl mx-auto h-full px-4 pb-20 md:px-6'}`}>
                            <ErrorBoundary>
                                <Suspense fallback={<RouteLoadingScreen />}>
                                    <Routes location={location} key={routeSectionKey}>
                                        <Route path="/" element={<Navigate to="/inspiration" replace />} />
                                        <Route path="/inspiration" element={<InspirationModule />} />
                                        <Route path="/inspiration/c/:categoryId" element={<InspirationModule />} />
                                        <Route path="/inspiration/archive" element={<InspirationArchiveModule />} />
                                        <Route path="/data" element={<DataCenterModule />} />
                                        <Route path="/share-receiver" element={<ShareReceiver />} />
                                        <Route path="*" element={<Navigate to="/inspiration" replace />} />
                                    </Routes>
                                </Suspense>
                            </ErrorBoundary>
                        </div>
                    </main>

                    <ShortcutHelpModal />
                    <EmailLinkCompletionModal />
                    {!isShareReceiverRoute && <IOSAddToHomePrompt />}
                </div>
            </KeymapProvider>
        </LanguageProvider>
    );
}

export default App;
