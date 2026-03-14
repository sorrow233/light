import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sonner';
import { KeymapProvider, ShortcutHelpModal, useBrowserIntercept } from './features/shortcuts';
import { LanguageProvider } from './features/i18n';
import { useIOSStandalone } from './hooks/useIOSStandalone';
import RouteLoadingScreen from './components/shared/RouteLoadingScreen';

const InspirationModule = lazy(() => import('./features/lifecycle/InspirationModule'));
const InspirationArchiveModule = lazy(() => import('./features/lifecycle/InspirationArchiveModule'));
const DataCenterModule = lazy(() => import('./features/lifecycle/DataCenterModule'));
const ShareReceiver = lazy(() => import('./features/share/ShareReceiver'));

function App() {
    const location = useLocation();
    const { isIOSStandalone } = useIOSStandalone();
    const routeSectionKey = location.pathname.split('/')[1] || 'root';
    const isShareReceiverRoute = location.pathname === '/share-receiver';

    useBrowserIntercept();

    return (
        <LanguageProvider>
            <KeymapProvider>
                <div className={`flex flex-col h-screen min-h-dvh h-dvh overflow-hidden bg-gray-50/50 dark:bg-gray-950 ${isIOSStandalone ? 'ios-standalone' : ''}`}>
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
                </div>
            </KeymapProvider>
        </LanguageProvider>
    );
}

export default App;
