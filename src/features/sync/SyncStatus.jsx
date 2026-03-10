import React from 'react';
import { RefreshCw, WifiOff, Cloud, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SyncStatus Component
 * 
 * Visualizes the current sync state with a premium, unobtrusive design.
 * 
 * States:
 * - Synced: Subtle green dot + "Synced".
 * - Syncing: Animated yellow loader + "Saving...".
 * - Offline: Gray icon + "Offline".
 * 
 * Props:
 * - status: 'synced' | 'syncing' | 'offline' | 'disconnected'
 * - pendingCount: number (optional, for "Saving (3)...")
 */
const SyncStatus = ({ status, pendingCount = 0, themeColor }) => {

    // Helper for status config
    const getConfig = () => {
        switch (status) {
            case 'synced':
                // Use themeColor if available, otherwise default to emerald
                const dotColor = themeColor ? themeColor.dot : 'bg-emerald-500';
                const shadowColor = themeColor ? themeColor.shadow : 'shadow-[0_0_8px_rgba(16,185,129,0.4)]';
                const textColor = themeColor ? themeColor.text : 'text-emerald-600';
                const bgColor = themeColor ? themeColor.bg : 'bg-emerald-50/50';

                return {
                    icon: <div className={`w-2 h-2 rounded-full ${dotColor} ${shadowColor}`} />,
                    text: 'Synced',
                    color: `${textColor} ${bgColor}`,
                    tooltip: 'All changes saved to cloud'
                };
            case 'syncing':
                return {
                    icon: <RefreshCw size={14} className="animate-spin text-amber-500" />,
                    text: pendingCount > 0 ? `Saving (${pendingCount})...` : 'Saving...',
                    color: 'text-amber-600 bg-amber-50/50',
                    tooltip: 'Syncing changes to cloud...'
                };
            case 'offline':
                return {
                    icon: <WifiOff size={14} className="text-gray-400" />,
                    text: 'Offline',
                    color: 'text-gray-500 bg-gray-100/50',
                    tooltip: 'Changes saved to device. Will sync when online.'
                };
            default: // disconnected
                return {
                    icon: <Cloud size={14} className="text-gray-400" />,
                    text: 'Connecting...',
                    color: 'text-gray-500 bg-gray-100/50',
                    tooltip: 'Connecting to sync server...'
                };
        }
    };

    const config = getConfig();

    return (
        <div className="group relative flex items-center justify-center">
            <motion.div
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full 
                    transition-colors duration-300 backdrop-blur-sm
                    border border-transparent hover:border-black/5
                    min-w-[100px]
                    ${config.color}
                `}
            >
                {config.icon}
                <span className="text-xs font-medium tracking-wide">
                    {config.text}
                </span>
            </motion.div>


        </div>
    );
};

export default SyncStatus;
