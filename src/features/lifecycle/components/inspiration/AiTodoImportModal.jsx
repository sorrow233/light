import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Copy, Hash, ListChecks, Sparkles, X } from 'lucide-react';

const MODE_META = {
    prompt: {
        title: '整理导入',
        caption: '通用提示词',
        description: '复制通用提示词给常用 AI，让它把听写、口语或 OCR 内容整理成可导入清单。',
        detail: '适合原始内容比较乱的时候，先让 AI 帮你变成标准待办列表。',
        copyIdleLabel: '复制提示词',
        copySuccessLabel: '提示词已复制',
        inputLabel: '粘贴 AI 整理结果',
        inputHint: '把 AI 输出的最终清单粘贴回来，支持编号和逐行输入。',
        inputPlaceholder: '示例：\n1. 整理明天会议的目标\n2. 完成产品首页文案\n3. 联系设计师确认图标',
        submitLabel: '批量导入',
        icon: Sparkles,
    },
    todo: {
        title: '未办清单',
        caption: '当前 todo',
        description: '复制当前所有未完成 TODO，交给 AI 做重排、补全或去重后，再把结果粘贴回来。',
        detail: '适合已经有一批待办，只想快速重整，不想手动一点点改。',
        copyIdleLabel: '复制未办清单',
        copySuccessLabel: '未办清单已复制',
        inputLabel: '粘贴 AI 重整后的清单',
        inputHint: '仍然支持编号和换行，导入后会直接生成新的待办条目。',
        inputPlaceholder: '示例：\n1. 优先确认本周上线事项\n2. 收拾房间\n3. 统一整理阅读链接',
        submitLabel: '批量导入',
        icon: ListChecks,
    },
    classify: {
        title: 'AI 分类',
        caption: '辅助级别',
        description: '复制分类提示词给 AI，让它只返回“编号 + 分类”，再粘贴回来更新辅助级别。',
        detail: '适合你想快速区分哪些任务能交给 AI，哪些仍然需要自己完成。',
        copyIdleLabel: '复制分类提示词',
        copySuccessLabel: '分类提示词已复制',
        inputLabel: '粘贴 AI 分类结果',
        inputHint: '只接受“编号 + 分类”格式，例如：1. AI 高度辅助。',
        inputPlaceholder: '示例：\n1. AI 高度辅助\n2. 必须自己去完成\n3. AI 完成',
        submitLabel: '导入分类',
        icon: Hash,
    },
};

function StatusPill({ children, tone = 'default' }) {
    const toneClasses = tone === 'accent'
        ? 'border-pink-200/80 bg-pink-50 text-pink-500 dark:border-pink-800/60 dark:bg-pink-900/20 dark:text-pink-200'
        : 'border-gray-200/80 bg-white/80 text-gray-500 dark:border-gray-700/70 dark:bg-gray-900/40 dark:text-gray-300';

    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClasses}`}>
            {children}
        </span>
    );
}

function MessageBanner({ children, tone }) {
    const toneClasses = tone === 'error'
        ? 'border-red-100 bg-red-50 text-red-500 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300'
        : 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300';

    return (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses}`}>
            {children}
        </div>
    );
}

function getModePills(mode, pendingTodoCount, unclassifiedTodoCount) {
    if (mode === 'todo') {
        return [
            { label: `${pendingTodoCount} 条未完成待办`, tone: 'accent' },
            { label: '输出建议：编号清单', tone: 'default' },
        ];
    }

    if (mode === 'classify') {
        return [
            { label: `${unclassifiedTodoCount} 条待分类`, tone: 'accent' },
            { label: '输出格式：编号 + 分类', tone: 'default' },
        ];
    }

    return [
        { label: '支持听写 / OCR / 口语', tone: 'accent' },
        { label: '输出格式：编号清单', tone: 'default' },
    ];
}

export default function AiTodoImportModal({
    isOpen,
    mode,
    onModeChange,
    onClose,
    pendingTodoCount,
    unclassifiedTodoCount,
    isPromptCopied,
    isTodoCopied,
    isClassifyPromptCopied,
    onCopyPrompt,
    onCopyPendingTodos,
    onCopyClassifyPrompt,
    aiImportText,
    onAiImportTextChange,
    aiImportError,
    aiImportSuccessCount,
    onBatchImport,
    aiClassifyText,
    onAiClassifyTextChange,
    aiClassifyError,
    aiClassifySuccessCount,
    onApplyClassification,
}) {
    const activeMode = MODE_META[mode] || MODE_META.prompt;
    const ActiveIcon = activeMode.icon;
    const isClassifyMode = mode === 'classify';
    const isCopyDisabled = mode === 'todo'
        ? pendingTodoCount === 0
        : isClassifyMode
            ? unclassifiedTodoCount === 0
            : false;

    const isCopyDone = mode === 'todo'
        ? isTodoCopied
        : isClassifyMode
            ? isClassifyPromptCopied
            : isPromptCopied;

    const handleCopy = () => {
        if (mode === 'todo') {
            onCopyPendingTodos();
            return;
        }

        if (isClassifyMode) {
            onCopyClassifyPrompt();
            return;
        }

        onCopyPrompt();
    };

    const messageError = isClassifyMode ? aiClassifyError : aiImportError;
    const messageSuccessCount = isClassifyMode ? aiClassifySuccessCount : aiImportSuccessCount;
    const textareaValue = isClassifyMode ? aiClassifyText : aiImportText;
    const handleTextareaChange = isClassifyMode ? onAiClassifyTextChange : onAiImportTextChange;
    const handleSubmit = isClassifyMode ? onApplyClassification : onBatchImport;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-white/45 dark:bg-black/45 backdrop-blur-xl"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.96, opacity: 0, y: 18 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.96, opacity: 0, y: 18 }}
                        transition={{ duration: 0.24 }}
                        className="w-full max-w-[780px] bg-white/95 dark:bg-gray-900/95 border border-white/60 dark:border-gray-800 rounded-[2rem] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)] overflow-hidden"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="px-6 py-5 border-b border-pink-100/70 dark:border-pink-900/30 bg-gradient-to-r from-pink-50/90 via-rose-50/60 to-white dark:from-pink-900/30 dark:via-rose-900/20 dark:to-gray-900">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 text-pink-500 dark:text-pink-300 mb-2">
                                        <Sparkles size={16} />
                                        <span className="text-xs font-semibold tracking-wide uppercase">AI ToDo Import</span>
                                    </div>
                                    <h3 className="text-[30px] leading-tight font-light text-gray-900 dark:text-white tracking-tight">
                                        AI 批量导入代办
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-light">
                                        只保留核心流程：切换功能，复制给 AI，再把结果粘贴回来。
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/70 dark:hover:bg-gray-800 text-gray-400 hover:text-pink-500 dark:hover:text-pink-300 transition-colors"
                                    title="关闭"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
                            <div className="grid grid-cols-3 gap-3">
                                {Object.entries(MODE_META).map(([modeKey, meta]) => {
                                    const ModeIcon = meta.icon;
                                    const isActive = modeKey === mode;

                                    return (
                                        <button
                                            key={modeKey}
                                            type="button"
                                            onClick={() => onModeChange(modeKey)}
                                            className={`rounded-2xl border p-4 text-left transition-all ${isActive
                                                ? 'border-pink-200 bg-pink-50/90 shadow-[0_12px_30px_-18px_rgba(236,72,153,0.65)] dark:border-pink-700/60 dark:bg-pink-900/20'
                                                : 'border-gray-200/80 bg-white/80 hover:border-pink-100 hover:bg-pink-50/50 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-pink-800/50 dark:hover:bg-pink-900/10'
                                                }`}
                                            aria-pressed={isActive}
                                        >
                                            <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${isActive
                                                ? 'bg-pink-500 text-white'
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300'
                                                }`}
                                            >
                                                <ModeIcon size={18} />
                                            </div>
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                                {meta.title}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                {meta.caption}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="rounded-[1.75rem] border border-pink-100 dark:border-pink-800/40 bg-pink-50/60 dark:bg-pink-900/15 p-5">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-pink-500 shadow-sm dark:bg-gray-900 dark:text-pink-300">
                                            <ActiveIcon size={20} />
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-semibold tracking-wide uppercase text-pink-500 dark:text-pink-300">
                                                当前功能
                                            </div>
                                            <h4 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                                                {activeMode.title}
                                            </h4>
                                            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                                {activeMode.description}
                                            </p>
                                            <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                {activeMode.detail}
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {getModePills(mode, pendingTodoCount, unclassifiedTodoCount).map((pill) => (
                                                    <StatusPill key={pill.label} tone={pill.tone}>
                                                        {pill.label}
                                                    </StatusPill>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        disabled={isCopyDisabled}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <Copy size={14} />
                                        {isCopyDone ? activeMode.copySuccessLabel : activeMode.copyIdleLabel}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-2">
                                        {activeMode.inputLabel}
                                    </label>
                                    <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                                        {activeMode.inputHint}
                                    </p>
                                    <textarea
                                        value={textareaValue}
                                        onChange={(event) => handleTextareaChange(event.target.value)}
                                        placeholder={activeMode.inputPlaceholder}
                                        className="w-full min-h-[220px] rounded-[1.75rem] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 p-4 outline-none focus:ring-2 focus:ring-pink-300/50 dark:focus:ring-pink-700/50 focus:border-pink-300 dark:focus:border-pink-700 transition-all"
                                    />
                                </div>

                                {messageError && (
                                    <MessageBanner tone="error">
                                        {messageError}
                                    </MessageBanner>
                                )}

                                {messageSuccessCount > 0 && (
                                    <MessageBanner tone="success">
                                        {isClassifyMode
                                            ? `已成功分类 ${messageSuccessCount} 条未分类代办。`
                                            : `已成功导入 ${messageSuccessCount} 条代办。`}
                                    </MessageBanner>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    关闭
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!textareaValue.trim()}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-pink-100 dark:shadow-pink-900/30"
                                >
                                    <ArrowRight size={14} />
                                    {activeMode.submitLabel}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
