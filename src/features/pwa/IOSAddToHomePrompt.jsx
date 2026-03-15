import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Share, Plus, X } from 'lucide-react';
import { useIOSAddToHomePrompt } from './useIOSAddToHomePrompt';

const IOSAddToHomePrompt = () => {
    const { isVisible, dismissPrompt } = useIOSAddToHomePrompt();

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="fixed inset-x-4 bottom-4 z-[90] mx-auto w-auto max-w-sm"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)' }}
                >
                    <div className="rounded-[24px] border border-gray-200/90 bg-white/96 p-4 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.32)] backdrop-blur-xl">
                        <div className="flex items-start gap-3">
                            <div
                                className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                                style={{
                                    backgroundColor: 'var(--accent-soft-bg)',
                                    color: 'var(--accent-500)',
                                }}
                            >
                                <Share size={16} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="mb-1 text-sm font-medium text-gray-900">添加到主屏幕</div>
                                <div className="text-sm leading-6 text-gray-500">
                                    在 Safari 点
                                    <span className="mx-1 inline-flex h-5 w-5 translate-y-[1px] items-center justify-center rounded-full bg-gray-100 text-gray-500">
                                        <Share size={11} />
                                    </span>
                                    分享，再点
                                    <span className="mx-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                        <Plus size={11} />
                                        添加到主屏幕
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={dismissPrompt}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-500"
                                aria-label="关闭添加到主屏幕提示"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default IOSAddToHomePrompt;
