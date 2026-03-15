import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const RouteLoadingScreen = () => {
    const shouldReduceMotion = useReducedMotion();

    return (
        <div className="flex min-h-[45vh] w-full items-center justify-center px-6 py-16">
            <div
                role="status"
                aria-live="polite"
                aria-busy="true"
                className="flex w-full max-w-[240px] flex-col items-center text-center"
            >
                <div className="flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
                    <motion.span
                        className="h-1.5 w-1.5 rounded-full bg-pink-500/85"
                        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: [0.35, 1, 0.35] }}
                        transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <span>Light</span>
                </div>

                <div className="mt-5 h-[2px] w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <motion.div
                        className="h-full w-16 rounded-full bg-pink-500/75"
                        animate={shouldReduceMotion ? { x: '30%' } : { x: ['-120%', '260%'] }}
                        transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </div>

                <p className="mt-4 text-center text-[15px] font-medium text-slate-700 dark:text-slate-200">
                    正在加载页面
                </p>
                <p className="mt-1 text-center text-sm text-slate-400 dark:text-slate-500">
                    同步当前视图内容
                </p>
            </div>
        </div>
    );
};

export default RouteLoadingScreen;
