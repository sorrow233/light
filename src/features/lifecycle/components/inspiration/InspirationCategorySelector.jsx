import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Settings2 } from 'lucide-react';

const InspirationCategorySelector = ({
    categories = [],
    selectedCategory,
    onSelectCategory,
    onOpenManager,
    onTodoDoubleClick,
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const selectorRef = useRef(null);
    const selectedCategoryInfo = useMemo(
        () => categories.find((category) => category.id === selectedCategory) || categories[0] || null,
        [categories, selectedCategory]
    );

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
            className="relative z-20 flex items-center p-1 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-full border border-gray-100/50 dark:border-gray-800/50 shadow-sm transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-900/80 hover:shadow-md hover:border-pink-100/30 dark:hover:border-pink-900/30 group/selector"
        >
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 border-r border-gray-200/50 dark:border-gray-700/50 mr-1 min-w-[76px] justify-center relative overflow-hidden h-7 rounded-l-full transition-all duration-200 ${isMenuOpen
                        ? 'bg-white/70 dark:bg-gray-800/70 shadow-sm'
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
                            className="absolute left-0 top-[calc(100%+10px)] z-40 w-[176px] overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.94),rgba(8,15,31,0.96))] p-1.5 shadow-[0_22px_56px_rgba(2,6,23,0.42)] backdrop-blur-2xl"
                        >
                            <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto no-scrollbar">
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
                                            className={`flex items-center gap-2 rounded-[18px] border px-2.5 py-2 text-left transition-all duration-200 ${isActive
                                                ? 'border-white/12 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                                                : 'border-transparent text-white/68 hover:bg-white/6 hover:text-white'
                                                }`}
                                        >
                                            <span className={`h-2.5 w-2.5 rounded-full ${category.dotColor}`} />
                                            <span className={`flex-1 truncate text-xs font-medium ${isActive ? category.textColor || 'text-white' : ''}`}>
                                                {category.label}
                                            </span>
                                            {isActive && <Check size={13} className="text-white/70" />}
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
                            onDoubleClick={() => {
                                if (category.id === 'todo' && selectedCategory === category.id) {
                                    onTodoDoubleClick?.();
                                }
                            }}
                            className="relative w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 group/dot flex-shrink-0"
                            title={category.id === 'todo'
                                ? `${category.label} · 双击打开 AI 批量导入`
                                : category.label}
                        >
                            {selectedCategory === category.id && (
                                <motion.div
                                    layoutId="activeCategory"
                                    className="absolute inset-0 bg-white dark:bg-gray-700 rounded-full shadow-sm border border-gray-100 dark:border-gray-600"
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
                    className="relative w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 group/settings hover:bg-gray-100 dark:hover:bg-gray-800 ml-1 flex-shrink-0"
                    title="管理分类"
                >
                    <Settings2 size={14} className="text-gray-400 group-hover/settings:text-gray-600 dark:group-hover/settings:text-gray-300 transition-colors" />
                </button>
            </div>
        </div>
    );
};

export default InspirationCategorySelector;
