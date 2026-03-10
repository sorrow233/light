import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { useAppShortcut } from './useAppShortcut';
import { getKeymapByScope, SCOPE_LABELS } from './keymap.config';
import ShortcutKbd from './ShortcutKbd';

/**
 * ShortcutHelpModal - Shift + ? 触发的快捷键帮助面板
 */
const ShortcutHelpModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    // 监听 Shift + ? 打开帮助面板
    useAppShortcut('HELP', () => setIsOpen(true));

    // ESC 关闭
    useAppShortcut('CLOSE_MODAL', () => setIsOpen(false), { enabled: isOpen });

    const groupedKeymap = getKeymapByScope();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden pointer-events-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                                        <Keyboard size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            快捷键
                                        </h2>
                                        <p className="text-xs text-gray-500">
                                            Keyboard Shortcuts
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                                {Object.entries(groupedKeymap).map(([scope, shortcuts]) => (
                                    <div key={scope}>
                                        {/* Scope Header */}
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                            {SCOPE_LABELS[scope]?.label || scope}
                                        </h3>

                                        {/* Shortcuts List */}
                                        <div className="space-y-2">
                                            {shortcuts.map(({ actionId, label, labelEn, keys }) => (
                                                <div
                                                    key={actionId}
                                                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl"
                                                >
                                                    <div>
                                                        <span className="text-sm text-gray-700">
                                                            {label}
                                                        </span>
                                                        <span className="text-xs text-gray-400 ml-2">
                                                            {labelEn}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {keys.map((combo, idx) => (
                                                            <React.Fragment key={combo}>
                                                                {idx > 0 && (
                                                                    <span className="text-xs text-gray-300">
                                                                        or
                                                                    </span>
                                                                )}
                                                                <ShortcutKbd shortcut={combo} size="md" />
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                                <p className="text-xs text-gray-400 text-center">
                                    按 <ShortcutKbd shortcut="escape" /> 关闭
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ShortcutHelpModal;
