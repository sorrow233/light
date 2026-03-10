import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Spotlight from './shared/Spotlight';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Lightbulb,
    Cloud,
    Settings,
    Sun,
    Moon,
    BarChart3,
    Database
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import AuthModal from '../features/auth/AuthModal';
import { useSync } from '../features/sync/SyncContext';
import SyncStatus from '../features/sync/SyncStatus';
import { DataManagementModal } from '../features/settings';
import { useTheme } from '../hooks/ThemeContext';
import { useTranslation } from '../features/i18n';

const tabIcons = {
    inspiration: Lightbulb,
    data: BarChart3
};

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isDataModalOpen, setIsDataModalOpen] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const { t } = useTranslation();

    const tabs = [
        { id: 'inspiration', label: t('navbar.inspiration'), icon: tabIcons.inspiration, path: '/inspiration' },
        { id: 'data', label: t('navbar.data'), icon: tabIcons.data, path: '/data' },
    ];

    const { status } = useSync();

    const getActiveTheme = () => {
        const path = location.pathname;
        if (path.startsWith('/inspiration')) return 'pink';
        if (path.startsWith('/data')) return 'indigo';
        return 'default';
    };

    const activeTheme = getActiveTheme();

    const themeConfigs = {
        pink: {
            spotlight: isDark ? "rgba(244, 114, 182, 0.15)" : "rgba(244, 114, 182, 0.12)",
            iconText: 'text-pink-400 dark:text-pink-300',
            iconHover: 'hover:bg-pink-50 dark:hover:bg-pink-900/20',
            sync: { dot: 'bg-pink-400', shadow: 'shadow-[0_0_8px_rgba(244,114,182,0.4)]', text: 'text-pink-500', bg: 'bg-pink-50/50 dark:bg-pink-900/20' }
        },
        indigo: {
            spotlight: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)",
            iconText: 'text-indigo-500 dark:text-indigo-400',
            iconHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
            sync: { dot: 'bg-indigo-500', shadow: 'shadow-[0_0_8px_rgba(99,102,241,0.4)]', text: 'text-indigo-600', bg: 'bg-indigo-50/50 dark:bg-indigo-900/20' }
        },
        default: {
            spotlight: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)",
            iconText: 'text-gray-400 dark:text-gray-500',
            iconHover: 'hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
            sync: null
        }
    };

    const currentConfig = themeConfigs[activeTheme] || themeConfigs.default;

    return (
        <div className="relative z-50 flex w-full justify-center px-3 pb-3 pt-4 md:px-4 md:pb-4 md:pt-10">
            <nav className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-full shadow-sm max-w-[95vw] md:max-w-full relative mx-auto">
                <Spotlight spotColor={currentConfig.spotlight} size={300} className="rounded-full">
                    <div className="flex items-center gap-3 md:gap-8 px-2 py-2 md:px-6 md:py-3 overflow-x-auto no-scrollbar mask-linear-fade">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = location.pathname.startsWith(tab.path);
                            const activeColors = {
                                inspiration: '!text-pink-400 dark:!text-pink-300',
                                data: 'text-indigo-500 dark:text-indigo-400',
                            };

                            const activeColorClass = activeColors[tab.id] || 'text-gray-900 dark:text-white';
                            const tabTheme = themeConfigs[
                                tab.id === 'inspiration'
                                    ? 'pink'
                                    : tab.id === 'data'
                                        ? 'indigo'
                                        : 'default'
                            ];

                            const brushGradients = {
                                inspiration: 'from-pink-200/80 via-pink-300/60 to-transparent dark:from-pink-700/50 dark:via-pink-600/30',
                                data: 'from-indigo-200/80 via-indigo-300/60 to-transparent dark:from-indigo-700/50 dark:via-indigo-600/30'
                            };

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => navigate(tab.path)}
                                    className={`
                                        relative flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-all duration-300 whitespace-nowrap z-50 shrink-0
                                        hover:scale-105 active:scale-95
                                        ${isActive
                                            ? `${activeColorClass}`
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}
                                    `}
                                >
                                    {isActive && (
                                        <div
                                            className="absolute inset-[-25%] z-[-1] pointer-events-none blur-2xl opacity-100"
                                            style={{
                                                background: `radial-gradient(circle at center, ${tabTheme.spotlight.replace('0.15', '0.4').replace('0.1', '0.3').replace('0.12', '0.3')} 0%, transparent 75%)`
                                            }}
                                        />
                                    )}

                                    {/* Active Brush Stroke */}
                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.span
                                                layoutId="nav-brush"
                                                initial={{ opacity: 0, scaleX: 0 }}
                                                animate={{ opacity: 1, scaleX: 1 }}
                                                exit={{ opacity: 0, scaleX: 0 }}
                                                className={`absolute -bottom-0.5 left-2 right-2 h-1.5 bg-gradient-to-r ${brushGradients[tab.id]} to-transparent rounded-full blur-[1px] z-[-1]`}
                                            />
                                        )}
                                    </AnimatePresence>

                                    <Icon size={16} strokeWidth={isActive ? 2 : 1.5} className="w-4 h-4 md:w-4 md:h-4" />
                                    <span className={`text-xs md:text-sm ${isActive ? 'font-medium' : 'font-light'}`}>{tab.label}</span>
                                </button>
                            );
                        })}

                        <div className="w-px h-5 md:h-6 bg-gray-100 dark:bg-gray-700 mx-2 md:mx-8 relative z-40 shrink-0" />

                        <div className="flex items-center gap-1 md:gap-1.5">
                            <button
                                onClick={toggleTheme}
                                className={`relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full transition-all z-40 shrink-0 ${currentConfig.iconText} ${currentConfig.iconHover}`}
                                title={`${isDark ? t('common.lightMode') : t('common.darkMode')} · 5h`}
                            >
                                {isDark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
                            </button>

                            <button
                                onClick={() => setIsDataModalOpen(true)}
                                className={`relative flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-full transition-all z-40 shrink-0 ${currentConfig.iconText} ${currentConfig.iconHover}`}
                                title={t('navbar.dataManagement')}
                            >
                                <Database size={16} strokeWidth={1.5} />
                            </button>

                            <div className="relative z-40 shrink-0">
                                <button onClick={() => setIsAuthModalOpen(true)} className="focus:outline-none">
                                    {user ? (
                                        <SyncStatus
                                            status={status}
                                            themeColor={currentConfig.sync}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 transition-all whitespace-nowrap">
                                            <Cloud size={14} />
                                            <span className="text-xs md:text-sm hidden sm:inline">{t('navbar.cloudSync')}</span>
                                            <span className="text-xs md:text-sm sm:hidden">{t('navbar.sync')}</span>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </Spotlight>
            </nav>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            <DataManagementModal isOpen={isDataModalOpen} onClose={() => setIsDataModalOpen(false)} />
        </div>
    );
};

export default Navbar;
