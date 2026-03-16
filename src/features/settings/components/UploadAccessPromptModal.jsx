import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { KeyRound, Loader2, X } from 'lucide-react';

const UploadAccessPromptModal = ({
    isOpen,
    value,
    error,
    isSubmitting,
    onChange,
    onClose,
    onConfirm,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 18 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 18 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                        className="relative z-10 w-full max-w-sm rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-xl font-light text-gray-900 dark:text-white">请输入兑换码</div>
                                    <div className="mt-1 text-sm text-gray-400">
                                        一次性兑换后将为当前账号开通会员上传权限
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="mt-5">
                                <div className="relative">
                                    <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        autoFocus
                                        value={value}
                                        onChange={(event) => onChange(event.target.value.toUpperCase())}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                onConfirm();
                                            }
                                        }}
                                        placeholder="输入会员兑换码"
                                        className="w-full rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/70 pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-amber-300 dark:focus:border-amber-700 transition-colors"
                                    />
                                </div>

                                {error ? (
                                    <div className="mt-3 rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50/70 dark:bg-red-900/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                                        {error}
                                    </div>
                                ) : (
                                    <div className="mt-3 text-xs text-gray-400">
                                        兑换码为一次性使用，只绑定当前 UID，不会写入导出备份。
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 py-3 text-sm text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-2xl bg-gray-900 dark:bg-white py-3 text-sm font-medium text-white dark:text-gray-900 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                                    确认激活
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default UploadAccessPromptModal;
