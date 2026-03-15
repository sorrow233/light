import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Settings2 } from 'lucide-react';
import { useTheme } from '../../../../hooks/ThemeContext';

const InspirationCategorySelector = ({
    categories = [],
    selectedCategory,
    onSelectCategory,
    onOpenManager,
    onCategoryDoubleClick,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const selectorRef = useRef(null);
    const { isDark } = useTheme();
    const selectedCategoryInfo = useMemo(
        () => categories.find((category) => category.id === selectedCategory) || categories[0] || null,
        [categories, selectedCategory]
    );
    const shouldUseLightMenu = !isDark;

    useEffect(() => {
        if (!isMenuOpen) return undefined;

        const handlePointerDown = (event) => {
            if (selectorRef.current?.contains(event.target)) return;
            setIsMenuOpen(false);
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMenuOpen]);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [selectedCategory]);

    if (categories.length === 0 || !selectedCategoryInfo) {
        return null;
    }

    return (
        <div
            ref={selectorRef}
            className={`relative z-20 flex items-center p-1 rounded-full border transition-all duration-300 group/selector ${shouldUseLightMenu
                ? 'bg-white/96 border-slate-200/88 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.26)] hover:bg-white'
                : 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-gray-100/50 dark:border-gray-800/50 shadow-sm hover:bg-white/80 dark:hover:bg-gray-900/80 hover:shadow-md hover:border-pink-100/30 dark:hover:border-pink-900/30'
                }`}
        >
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 mr-1 min-w-[76px] justify-center relative overflow-hidden h-7 rounded-l-full transition-all duration-200 ${shouldUseLightMenu ? 'border-r border-slate-200/80' : 'border-r border-gray-200/50 dark:border-gray-700/50'} ${isMenuOpen
                        ? shouldUseLightMenu
                            ? 'bg-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.24)]'
                            : 'bg-white/70 dark:bg-gray-800/70 shadow-sm'
                        : shouldUseLightMenu
                            ? 'hover:bg-white'
                            : 'hover:bg-white/60 dark:hover:bg-gray-800/60'
                        }`}
                    title="打开分类列表"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                >
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={selectedCategory}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className={`max-w-[72px] truncate text-xs font-medium ${selectedCategoryInfo.textColor || 'text-gray-700 dark:text-gray-300'}`}
                        >
                            {selectedCategoryInfo.label || 'Inspiration'}
                        </motion.span>
                    </AnimatePresence>
                    <ChevronDown
                        size={12}
                        className={`shrink-0 transition-transform duration-200 ${isMenuOpen
                            ? `${selectedCategoryInfo.textColor || 'text-pink-400'} rotate-180`
                            : 'text-gray-400'
                            }`}
                    />
                </button>

                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                            className={`absolute left-0 top-[calc(100%+10px)] z-40 w-[320px] max-w-[calc(100vw-32px)] overflow-hidden rounded-[22px] border p-2 transform-gpu md:w-[460px] ${shouldUseLightMenu
                                ? 'border-slate-200/92 bg-white shadow-[0_26px_60px_-28px_rgba(15,23,42,0.24)]'
                                : 'border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.94),rgba(8,15,31,0.96))] shadow-[0_22px_56px_rgba(2,6,23,0.42)] backdrop-blur-2xl'
                                }`}
                        >
                            <div className="grid max-h-[320px] grid-cols-2 gap-1.5 overflow-y-auto no-scrollbar md:grid-cols-3">
                                {categories.map((category) => {
                                    const isActive = selectedCategory === category.id;

                                    return (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() => {
                                                onSelectCategory?.(category.id);
                                                setIsMenuOpen(false);
                                            }}
                                            className={`relative flex min-h-[56px] items-start gap-2 rounded-[18px] border px-3 py-3 text-left transition-all duration-200 ${isActive
                                                ? shouldUseLightMenu
                                                    ? 'text-slate-900'
                                                    : 'border-white/12 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                                                : shouldUseLightMenu
                                                    ? 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                    : 'border-transparent text-white/68 hover:bg-white/6 hover:text-white'
                                                }`}
                                            style={isActive && shouldUseLightMenu
                                                ? {
                                                    borderColor: 'var(--accent-border)',
                                                    backgroundColor: 'var(--accent-soft-bg)',
                                                    boxShadow: '0 12px 24px -20px rgb(var(--accent-rgb) / 0.35)',
                                                }
                                                : undefined}
                                        >
                                            <span className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${category.dotColor}`} />
                                            <span className={`pr-5 text-xs font-medium leading-relaxed ${isActive
                                                ? category.textColor || (shouldUseLightMenu ? 'text-slate-900' : 'text-white')
                                                : shouldUseLightMenu ? 'text-slate-700' : ''
                                                }`}>
                                                {category.label}
                                            </span>
                                            {isActive && <Check size={13} className={`absolute right-3 top-3 ${shouldUseLightMenu ? 'text-slate-500' : 'text-white/70'}`} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 w-[140px] md:w-auto overflow-x-auto md:overflow-visible no-scrollbar">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => onSelectCategory?.(category.id)}
                            onDoubleClick={() => onCategoryDoubleClick?.(category.id)}
                            className="relative w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 group/dot flex-shrink-0"
                            title={`${category.label} · 双击直接复制这个分类`}
                        >
                            {selectedCategory === category.id && (
                                <motion.div
                                    layoutId="activeCategory"
                                    className={`absolute inset-0 rounded-full border ${shouldUseLightMenu
                                        ? 'bg-white border-slate-200/80 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.3)]'
                                        : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 shadow-sm'
                                        }`}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                            <div
                                className={`
                                    relative z-10 w-2.5 h-2.5 rounded-full transition-all duration-300
                                    ${category.dotColor}
                                    ${selectedCategory === category.id ? 'scale-110' : 'opacity-40 group-hover/dot:opacity-100 group-hover/dot:scale-110'}
                                `}
                            />
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={onOpenManager}
                    className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 group/settings ml-1 flex-shrink-0 ${shouldUseLightMenu
                        ? 'hover:bg-slate-100'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                    title="管理分类"
                >
                    <Settings2 size={14} className="text-gray-400 group-hover/settings:text-gray-600 dark:group-hover/settings:text-gray-300 transition-colors" />
                </button>
            </div>
        </div>
    );
};

export default InspirationCategorySelector;
