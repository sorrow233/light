import React, { useCallback, useMemo } from 'react';
import { Trash2, Check, Pencil, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useTranslation } from '../../../i18n';
import RichTextInput from './RichTextInput';
import { parseRichText, getCategoryConfig } from './InspirationUtils';

// parseRichText/getCategoryConfig are imported from InspirationUtils.js

const InspirationItem = ({
    idea,
    allProjects = [],
    categories = [],
    onRemove,
    onArchive,
    onCopy,
    onUpdateColor,
    onUpdateNote,
    onUpdateContent,
    onToggleComplete,
    isArchiveView = false,
    copiedId,
    isSelectionMode = false,
    isSelected = false,
    onSelect,
    isTodoView = false,
    aiAssistClass = 'unclassified',
    aiAssistOptions = [],
    onSetAiAssistClass,
    showAiAssistControls = false,
}) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [isEditingContent, setIsEditingContent] = React.useState(false);
    const [isEditingNote, setIsEditingNote] = React.useState(false);
    const [exitDirection, setExitDirection] = React.useState(null); // 'right' for archive, 'left' for delete
    const [contentDraft, setContentDraft] = React.useState(idea.content || '');
    const [noteDraft, setNoteDraft] = React.useState(idea.note || '');
    const [isCharging, setIsCharging] = React.useState(false); // Visual feedback for long press
    const longPressTimer = React.useRef(null);
    const inputRef = React.useRef(null);
    const contentTextareaRef = React.useRef(null);
    const noteInputRef = React.useRef(null);
    const { t } = useTranslation();

    const categoryConfig = useMemo(
        () => getCategoryConfig(idea.category, categories),
        [idea.category, categories]
    );
    const isCompleted = idea.completed || false;
    const shouldHighlightExternalSource = Boolean(idea.source && !['user', 'ai-import'].includes(idea.source));

    // 缓存 parseRichText 计算结果，避免每次渲染都重新执行正则匹配
    const parsedContent = useMemo(() => parseRichText(idea.content, allProjects), [idea.content, allProjects]);

    const getAiAssistButtonClass = useCallback((value, isActive) => {
        if (!isActive) {
            return 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800';
        }

        switch (value) {
            case 'ai_done':
                return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
            case 'ai_high':
                return 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
            case 'ai_mid':
                return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
            case 'self':
                return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            default:
                return 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800';
        }
    }, []);

    // Focus textarea when entering edit mode
    React.useEffect(() => {
        if (isEditingContent && contentTextareaRef.current) {
            contentTextareaRef.current.focus();
        }
    }, [isEditingContent]);

    // Focus note input when entering note edit mode
    React.useEffect(() => {
        if (isEditingNote && noteInputRef.current) {
            noteInputRef.current.focus();
        }
    }, [isEditingNote]);

    // Sync contentDraft when idea.content changes externally
    React.useEffect(() => {
        if (!isEditingContent) {
            setContentDraft(idea.content || '');
        }
    }, [idea.content, isEditingContent]);

    // Sync noteDraft when idea.note changes externally
    React.useEffect(() => {
        if (!isEditingNote) {
            setNoteDraft(idea.note || '');
        }
    }, [idea.note, isEditingNote]);

    // Handle double click to toggle completion (persisted)
    const handleDoubleClick = (e) => {
        e.stopPropagation();
        onToggleComplete(idea.id, !isCompleted);
    };

    // Long press (1 second) to enter edit mode (or just visual feedback in archive)
    const handlePointerDown = (e) => {
        // Only trigger on left click
        if (e.button !== 0) return;

        setIsCharging(true);
        longPressTimer.current = setTimeout(() => {
            setIsCharging(false);
            if (!isArchiveView) {
                setIsEditingContent(true);
            }
            longPressTimer.current = null;
        }, 1000);
    };

    const cancelLongPress = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setIsCharging(false);
    };

    // Content editing handlers
    const handleContentSave = () => {
        if (contentDraft.trim() !== (idea.content || '')) {
            onUpdateContent?.(idea.id, contentDraft.trim());
        }
        setIsEditingContent(false);
    };

    const handleContentKeyDown = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleContentSave();
        }
        if (e.key === 'Escape') {
            setIsEditingContent(false);
            setContentDraft(idea.content || '');
        }
    };

    // Note editing handlers
    const handleNoteSave = () => {
        const trimmedNote = noteDraft.trim();
        if (trimmedNote !== (idea.note || '')) {
            onUpdateNote?.(idea.id, trimmedNote || undefined);
        }
        setIsEditingNote(false);
    };

    const handleNoteKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleNoteSave();
        }
        if (e.key === 'Escape') {
            setIsEditingNote(false);
            setNoteDraft(idea.note || '');
        }
    };

    // Handle dot click to edit note
    const handleDotClick = (e) => {
        e.stopPropagation();
        if (!isArchiveView) {
            setIsEditingNote(true);
        }
    };

    const x = useMotionValue(0);
    // Left swipe (delete) visual feedback
    const deleteBackgroundColor = useTransform(
        x,
        [0, -80, -200],
        ['rgba(252, 231, 243, 0)', 'rgba(252, 231, 243, 0.8)', 'rgba(239, 68, 68, 1)']
    );
    const deleteIconOpacity = useTransform(x, [0, -80, -150], [0, 0, 1]);
    const deleteIconScale = useTransform(x, [0, -80, -200], [0.5, 0.5, 1.2]);

    // Right swipe (archive/restore) visual feedback
    const archiveBackgroundColor = useTransform(
        x,
        [0, 80, 150],
        ['rgba(252, 231, 243, 0)', 'rgba(252, 231, 243, 0.6)', 'rgba(252, 231, 243, 1)']
    );
    const archiveIconOpacity = useTransform(x, [0, 80, 120], [0, 0, 1]);
    const archiveIconScale = useTransform(x, [0, 80, 150], [0.5, 0.5, 1.2]);

    const y = useMotionValue(0);
    const exitAnimation = useMemo(() => {
        if (exitDirection === 'right') {
            return { opacity: 0, x: 500, rotate: 12, scale: 0.9, transition: { duration: 0.2, ease: "easeOut" } };
        }
        if (exitDirection === 'left') {
            return { opacity: 0, x: -500, rotate: -12, scale: 0.9, transition: { duration: 0.2, ease: "easeOut" } };
        }
        // Category/filter switching should not look like swipe-delete.
        return { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.18, ease: "easeOut" } };
    }, [exitDirection]);

    return (
        <motion.div
            style={{ x }}
            drag={isSelectionMode ? false : 'x'}
            dragDirectionLock={!isSelectionMode}
            dragConstraints={isSelectionMode ? undefined : { left: 0, right: 0 }}
            dragElastic={isSelectionMode ? 0 : { right: 0.2, left: 0.2 }}
            onDragStart={() => {
                if (isSelectionMode) return;
                setIsDragging(true);
                cancelLongPress(); // Cancel long press when drag starts
            }}
            onDragEnd={(e, info) => {
                if (isSelectionMode) return;
                setIsDragging(false);
                // Right swipe: Archive (or Restore in archive view)
                if (info.offset.x > 150 || (info.velocity.x > 400 && info.offset.x > 50)) {
                    if (isArchiveView) {
                        // In Archive View, Right Swipe triggers Editing
                        setIsEditingContent(true);
                    } else {
                        // In Normal View, Right Swipe triggers Archive
                        setExitDirection('right');
                        onArchive?.(idea.id);
                    }
                    return;
                }
                // Left swipe: Delete
                if (info.offset.x < -200 || (info.velocity.x < -400 && info.offset.x < -50)) {
                    setExitDirection('left');
                    onRemove(idea.id);
                }
            }}
            onPointerDown={(e) => {
                if (isSelectionMode) return;
                handlePointerDown(e);
            }}
            onPointerUp={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onPointerLeave={cancelLongPress}

            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{
                opacity: 1,
                y: 0,
                scale: isCharging ? 1.03 : 1,
                x: 0
            }}
            transition={{
                x: { type: "spring", stiffness: 600, damping: 25 },
                scale: { type: "spring", stiffness: 300, damping: 20 }
            }}
            exit={exitAnimation}
            layout
            className={`relative group flex flex-col md:flex-row items-stretch md:items-start gap-2 md:gap-4 mb-4 ${isSelectionMode ? 'touch-pan-y' : 'touch-none'} select-none ${isCharging ? 'ring-2 ring-pink-400/60 shadow-lg shadow-pink-200/50 dark:shadow-pink-900/30' : ''} ${isSelected ? 'scale-[1.005]' : ''}`}
        >
            {/* Main Card Component */}
            <div
                className={`
                    relative flex-1 bg-white dark:bg-gray-900 rounded-xl p-5 
                    border shadow-sm 
                    transition-all duration-500 cursor-pointer active:scale-[0.99]
                    ${shouldHighlightExternalSource
                        ? 'border-cyan-300 dark:border-cyan-600 ring-1 ring-cyan-200/50 dark:ring-cyan-700/30'
                        : 'border-gray-100 dark:border-gray-800'}
                    ${isDragging ? '' : `hover:shadow-[0_0_20px_rgba(244,114,182,0.2)] hover:border-pink-200 dark:hover:border-pink-800/50`}
                    ${isSelected ? 'border-sky-200 bg-sky-50/45 shadow-[0_8px_22px_-18px_rgba(56,189,248,0.55)] dark:border-sky-700/65 dark:bg-slate-800/72' : ''}
                    ${isCompleted ? 'opacity-50' : ''}
                    z-10
                    group/card
                `}
                onClick={() => {
                    if (isDragging || isEditingContent) return;
                    if (isSelectionMode) {
                        onSelect?.(idea.id);
                        return;
                    }
                    if (!window.getSelection().toString()) {
                        onCopy(idea.content, idea.id);
                    }
                }}
                onDoubleClick={(e) => {
                    if (isSelectionMode) return;
                    handleDoubleClick(e);
                }}
            >
                {isSelectionMode && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect?.(idea.id);
                        }}
                        className={`absolute top-2.5 right-2.5 z-20 h-5 w-5 rounded-full border transition-all flex items-center justify-center ${isSelected
                            ? 'bg-sky-500 border-sky-500 text-white shadow-[0_0_0_2px_rgba(14,165,233,0.15)]'
                            : 'bg-white/95 dark:bg-gray-900/95 border-gray-300 dark:border-gray-600 text-transparent'
                            }`}
                        aria-label={isSelected ? '取消选择' : '选择此项'}
                    >
                        <Check size={10} strokeWidth={3} />
                    </button>
                )}

                {/* Swipe Background (Delete Action - Left) */}
                <motion.div
                    style={{ backgroundColor: deleteBackgroundColor }}
                    className={`absolute inset-0 rounded-xl flex items-center justify-end pr-6 -z-10`}
                >
                    <motion.div style={{ opacity: deleteIconOpacity, scale: deleteIconScale }}>
                        <Trash2 className="text-white" size={20} />
                    </motion.div>
                </motion.div>

                {/* Right Swipe (Archive/Restore/Edit) Background */}
                <motion.div
                    style={{ backgroundColor: archiveBackgroundColor }}
                    className="absolute inset-0 rounded-xl flex items-center justify-start pl-6 -z-10"
                >
                    <motion.div style={{ opacity: archiveIconOpacity, scale: archiveIconScale }}>
                        {isArchiveView ? (
                            <Pencil className="text-blue-500" size={20} />
                        ) : (
                            <Check className="text-pink-600" size={20} />
                        )}
                    </motion.div>
                </motion.div>

                <div className="flex items-start gap-3">
                    {/* Color Status Dot - Click to Edit Note */}
                    <div className="flex-shrink-0 mt-1.5 relative z-10">
                        <div
                            onClick={handleDotClick}
                            className={`w-2.5 h-2.5 rounded-full ${categoryConfig.dotColor} shadow-sm cursor-pointer transition-all duration-200 hover:scale-125 hover:ring-1 hover:ring-offset-1 hover:ring-pink-300/60 dark:hover:ring-pink-500/40 hover:ring-offset-white dark:hover:ring-offset-gray-900 ${isCompleted ? 'opacity-50' : ''}`}
                            title={t('inspiration.addNote', '添加随记')}
                        />
                        {/* Note Edit Popover */}
                        <AnimatePresence>
                            {isEditingNote && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                    className="absolute top-6 left-0 z-50 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-pink-200 dark:border-pink-800 p-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        ref={noteInputRef}
                                        type="text"
                                        value={noteDraft}
                                        onChange={(e) => setNoteDraft(e.target.value)}
                                        onKeyDown={handleNoteKeyDown}
                                        onBlur={handleNoteSave}
                                        placeholder={t('inspiration.notePlaceholder', '添加随记...')}
                                        className="w-full px-2 py-1.5 text-sm bg-pink-50 dark:bg-pink-900/30 rounded border-none outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                                    />
                                    <div className="mt-1.5 text-[9px] text-gray-400 flex items-center gap-2">
                                        <span>Enter {t('common.save', '保存')}</span>
                                        <span>·</span>
                                        <span>Esc {t('common.cancel', '取消')}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex-1 min-w-0">
                        {isEditingContent ? (
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <RichTextInput
                                    ref={contentTextareaRef}
                                    value={contentDraft}
                                    onChange={setContentDraft}
                                    onBlur={handleContentSave}
                                    onKeyDown={handleContentKeyDown}
                                    className="w-full text-gray-800 dark:text-gray-100 text-[15px] font-normal leading-relaxed whitespace-pre-wrap font-sans bg-pink-50/50 dark:bg-pink-900/20 rounded-lg p-3 outline-none border border-pink-200 dark:border-pink-800 focus:border-pink-400 dark:focus:border-pink-600 resize-none min-h-[80px]"
                                    placeholder={t('inspiration.editPlaceholder', 'Edit your idea...')}
                                />
                                <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                                    <span>⌘+Enter {t('common.save', 'to save')}</span>
                                    <span>·</span>
                                    <span>Esc {t('common.cancel', 'to cancel')}</span>
                                </div>
                            </div>
                        ) : (
                            /* View Mode: Parsed Rich Text */
                            <div className={`text-gray-700 dark:text-gray-200 text-[15px] font-normal leading-relaxed whitespace-pre-wrap font-sans transition-all duration-200 ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                                {parsedContent}
                            </div>
                        )}
                        {isTodoView && showAiAssistControls && aiAssistOptions.length > 0 && (
                            <div
                                className="mt-3 flex flex-wrap gap-1.5"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onDoubleClick={(e) => e.stopPropagation()}
                            >
                                {aiAssistOptions.map((option) => {
                                    const isActive = aiAssistClass === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSetAiAssistClass?.(idea.id, option.value);
                                            }}
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${getAiAssistButtonClass(option.value, isActive)}`}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Date/Time + Restore Button (Archive View) */}
                        <div className="mt-2 flex items-center justify-between">
                            <div className={`text-[11px] font-medium transition-colors ${categoryConfig.textColor} opacity-30 group-hover/card:opacity-80`}>
                                {new Date(idea.timestamp || Date.now()).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                })}
                                <span className="mx-1.5 opacity-30">·</span>
                                {new Date(idea.timestamp || Date.now()).toLocaleTimeString(undefined, {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                                {/* 来源标签 */}
                                {idea.tags && idea.tags.length > 0 && (
                                    <>
                                        <span className="mx-1.5 opacity-30">·</span>
                                        {idea.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </>
                                )}
                            </div>

                            {isArchiveView && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onArchive?.(idea.id);
                                    }}
                                    className="p-1.5 -mr-2 text-gray-300 hover:text-pink-500 hover:bg-pink-50 dark:text-gray-600 dark:hover:text-pink-400 dark:hover:bg-pink-900/20 rounded-lg transition-all opacity-0 group-hover/card:opacity-100"
                                    title={t('common.restore', 'Restore')}
                                >
                                    <RotateCcw size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Copied Indicator */}
                <AnimatePresence>
                    {copiedId === idea.id && (
                        <motion.div
                            key="copied-indicator"
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: -10 }}
                            className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-pink-500 text-white rounded-full shadow-lg shadow-pink-200/50 dark:shadow-pink-900/40 z-50 pointer-events-none"
                        >
                            <Check size={12} strokeWidth={3} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{t('common.copied', 'Copied')}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Note Display - Outside the Card */}
            {
                idea.note && (
                    <div className="w-full md:w-[140px] pt-1 md:pt-4 pl-4 md:pl-0 flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-500">
                        <p className={`text-[12px] font-medium ${categoryConfig.textColor} opacity-80 dark:opacity-70 leading-relaxed italic break-words select-text`}>
                            {idea.note}
                        </p>
                    </div>
                )
            }
        </motion.div >
    );
};

export default React.memo(InspirationItem);
