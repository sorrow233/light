import React from 'react';

const RouteLoadingScreen = () => {
    const loadingRows = ['w-full', 'w-[80%]', 'w-[66%]'];

    return (
        <div className="relative flex min-h-[48vh] w-full items-center justify-center overflow-hidden px-6 py-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.16),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.42),rgba(15,23,42,0))]" />
            <div className="absolute -left-12 top-10 h-36 w-36 rounded-full bg-pink-200/35 blur-3xl dark:bg-pink-500/12" />
            <div className="absolute -right-10 bottom-6 h-40 w-40 rounded-full bg-sky-100/45 blur-3xl dark:bg-sky-400/10" />

            <div
                role="status"
                aria-live="polite"
                aria-busy="true"
                className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white/75 p-7 shadow-[0_32px_90px_-40px_rgba(236,72,153,0.36)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 dark:shadow-[0_32px_90px_-40px_rgba(15,23,42,0.92)]"
            >
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/80 to-transparent dark:via-pink-400/30" />

                <div className="flex items-start gap-4">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                        <div className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-pink-200/90 via-white to-sky-100/80 dark:from-pink-500/18 dark:via-slate-900 dark:to-sky-400/10" />
                        <div className="absolute inset-[6px] rounded-[18px] border border-white/80 dark:border-white/10" />
                        <div className="absolute h-10 w-10 rounded-full border-2 border-pink-500/20 border-r-sky-300/70 border-t-pink-500/90 animate-[spin_2.4s_linear_infinite] motion-reduce:animate-none" />
                        <div className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-[0_0_0_10px_rgba(244,114,182,0.14)] dark:bg-pink-300 dark:shadow-[0_0_0_10px_rgba(236,72,153,0.18)]" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="inline-flex items-center gap-2 rounded-full bg-pink-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:bg-white/5 dark:text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse motion-reduce:animate-none" />
                            Light
                        </div>
                        <h2 className="mt-3 text-[22px] font-semibold tracking-[0.01em] text-slate-800 dark:text-slate-100">
                            正在点亮你的灵感空间
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            同步分类、随记与时间线，马上就好。
                        </p>
                    </div>
                </div>

                <div className="mt-6 rounded-[22px] border border-slate-100/80 bg-white/65 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                    <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        <span>Loading View</span>
                        <span>Syncing</span>
                    </div>
                    <div className="mt-4 space-y-3">
                        {loadingRows.map((rowWidth, index) => (
                            <div
                                key={rowWidth}
                                className={`h-2.5 rounded-full bg-gradient-to-r from-pink-100 via-sky-50 to-transparent dark:from-pink-400/20 dark:via-sky-300/10 dark:to-transparent ${rowWidth} animate-pulse motion-reduce:animate-none`}
                                style={{ animationDelay: `${index * 180}ms` }}
                            />
                        ))}
                    </div>
                    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-pink-500 via-sky-400 to-pink-300 animate-[pulse_1.8s_ease-in-out_infinite] motion-reduce:animate-none" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteLoadingScreen;
