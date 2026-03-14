import React from 'react';

const RouteLoadingScreen = () => {
    return (
        <div className="flex min-h-[45vh] w-full items-center justify-center px-6 py-16">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative flex h-14 w-14 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-pink-200/70 dark:border-pink-500/20" />
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-pink-200 border-t-pink-500 dark:border-slate-700 dark:border-t-pink-400" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Light
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        正在加载页面...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RouteLoadingScreen;
