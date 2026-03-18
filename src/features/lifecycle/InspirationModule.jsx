import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ArrowRight, Lightbulb, Hash, X, Calendar, ListChecks, Sparkles, Copy, Trash2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useSync } from '../sync/SyncContext';
import { useSyncedProjects } from '../sync/useSyncStore';
import { useImportQueue } from '../sync/hooks/useImportQueue';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../i18n';
import InspirationItem from './components/inspiration/InspirationItem';
import { COLOR_CONFIG, copyImageToClipboard } from './components/inspiration/InspirationUtils';
import RichTextInput from './components/inspiration/RichTextInput';
import Spotlight from '../../components/shared/Spotlight';
import { INSPIRATION_CATEGORIES } from '../../utils/constants';
import { useSyncedCategories } from '../sync/useSyncStore';
import CategoryManager from './components/inspiration/CategoryManager';
import ImageUploader from './components/inspiration/ImageUploader';
import InspirationCategorySelector from './components/inspiration/InspirationCategorySelector';
import AiTodoImportModal from './components/inspiration/AiTodoImportModal';
import { usePageTitle } from '../../hooks/usePageTitle';
import {
    buildCategoryExportText,
    buildCategoryTransferPrompt,
    normalizeIdeaTextForExport,
    parseCategoryTransferOutput,
} from './components/inspiration/categoryTransferUtils';
import { buildCategoryClipboardText } from './components/inspiration/categoryClipboardUtils';
import {
    buildIdeaCopyPayload,
    buildNumberedIdeaClipboardText,
} from './components/inspiration/ideaClipboardUtils';
import {
    buildInspirationCategoryPath,
    decodeCategoryRoutePart,
    DEFAULT_INSPIRATION_CATEGORY_ID,
    resolveCategoryFallback,
} from './components/inspiration/categoryRouteUtils';
import {
    createImportedIdea,
    shouldRevealImportedIdea
} from './utils/importedIdeaUtils';
import { hexToRgba, resolveCategoryAccentHex } from './components/inspiration/categoryThemeUtils';
import { useTheme } from '../../hooks/ThemeContext';

// Auto color logic: Every 3 items, switch to next color
const getNextAutoColorIndex = (totalCount) => {
    const groupIndex = Math.floor(totalCount / 3);
    return groupIndex % COLOR_CONFIG.length;
};

const TODO_AI_CLASS_UNCLASSIFIED = 'unclassified';
const TODO_AI_FILTER_PENDING = 'pending';
const TAG_REGEX = /\[([^\]]+)\]/g;

const TODO_AI_CLASS_OPTIONS = [
    { value: 'ai_done', label: 'AI 完成' },
    { value: 'ai_high', label: 'AI 高度辅助' },
    { value: 'ai_mid', label: 'AI 中度辅助' },
    { value: 'self', label: '必须自己去完成' },
];

const TODO_AI_FILTER_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: TODO_AI_FILTER_PENDING, label: '所有未完成' },
    { value: TODO_AI_CLASS_UNCLASSIFIED, label: '未分类' },
    ...TODO_AI_CLASS_OPTIONS,
];


const InspirationModule = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { categoryId: routeCategoryParam } = useParams();
    const routeCategoryId = decodeCategoryRoutePart(routeCategoryParam);
    const { user } = useAuth();
    const { isDark } = useTheme();
    // Sync - 使用 immediateSync 实现即时同步
    const { doc, immediateSync, status, ready } = useSync();

    // Custom Categories
    const { categories: syncedCategories, addCategory, updateCategory, removeCategory } = useSyncedCategories(
        doc,
        'inspiration_categories',
        INSPIRATION_CATEGORIES,
        {
            initializeDefaults: status === 'synced',
            cleanupDuplicates: true,
        }
    );
    const isCategoryCatalogHydrated = syncedCategories.length > 0 || status === 'synced';

    // Merge synced categories with defaults to ensure colors exist (fixes missing colors in old data)
    // Also deduplicate by ID to handle potential sync data corruption
    const categories = useMemo(() => {
        const baseCategories = syncedCategories.length > 0 ? syncedCategories : INSPIRATION_CATEGORIES;

        const uniqueMap = new Map();
        baseCategories.forEach(cat => {
            if (!uniqueMap.has(cat.id)) {
                uniqueMap.set(cat.id, cat);
            }
        });

        return Array.from(uniqueMap.values()).map(cat => {
            const defaultCat = INSPIRATION_CATEGORIES.find(d => d.id === cat.id);
            if (defaultCat) {
                return {
                    ...defaultCat,
                    ...cat,
                    textColor: cat.textColor || defaultCat.textColor,
                    dotColor: cat.dotColor || defaultCat.dotColor,
                    color: cat.color || defaultCat.color
                };
            }
            return cat;
        });
    }, [syncedCategories]);
    const categoryConfigList = useMemo(() => categories, [categories]);

    const [isCategoryManagerOpen, setCategoryManagerOpen] = useState(false);

    const { t } = useTranslation();
    const {
        projects: allIdeas,
        addProject: addProjectBase,
        addProjects: addProjectsBase,
        removeProject: removeProjectBase,
        updateProject: updateProjectBase
    } = useSyncedProjects(doc, 'inspiration_items');

    // 包装 CRUD 操作，添加即时同步（仅 Inspiration 页面）
    const addIdea = useCallback((idea) => {
        addProjectBase(idea);
        immediateSync?.();
    }, [addProjectBase, immediateSync]);

    const addIdeasBatch = useCallback((ideasToAdd) => {
        if (!Array.isArray(ideasToAdd) || ideasToAdd.length === 0) return;
        addProjectsBase(ideasToAdd);
        immediateSync?.();
    }, [addProjectsBase, immediateSync]);

    const removeIdea = useCallback((id) => {
        removeProjectBase(id);
        immediateSync?.();
    }, [removeProjectBase, immediateSync]);

    const updateIdea = useCallback((id, updates) => {
        updateProjectBase(id, updates);
        immediateSync?.();
    }, [updateProjectBase, immediateSync]);

    // Filter for active ideas
    const ideas = useMemo(() =>
        allIdeas.filter((idea) => (idea.stage || 'inspiration') !== 'archive'),
        [allIdeas]);

    const handleImportedIdea = useCallback(({ text, timestamp, source, order = 0 }) => {
        const newIdea = createImportedIdea({
            text,
            timestamp,
            source,
            colorIndex: getNextAutoColorIndex(ideas.length + order)
        });

        addIdea(newIdea);

        if (shouldRevealImportedIdea(selectedCategory)) {
            setSelectedCategory(DEFAULT_INSPIRATION_CATEGORY_ID);
            toast.success('外部内容已导入到「笔记」分类');
            return;
        }

        toast.success('外部内容已导入灵感箱');
    }, [addIdea, ideas.length, selectedCategory]);

    // 处理待导入队列（从外部项目发送的内容）
    useImportQueue(user?.uid, handleImportedIdea, ready);

    const [input, setInput] = useState('');
    const [selectedColorIndex, setSelectedColorIndex] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [showWeekSelector, setShowWeekSelector] = useState(false);
    const [deletedIdeas, setDeletedIdeas] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(() => routeCategoryId || DEFAULT_INSPIRATION_CATEGORY_ID); // 分类状态
    const [isSelectionMode, setIsSelectionMode] = useState(false); // 多选模式
    const [selectedIdeaIds, setSelectedIdeaIds] = useState([]); // 已选中的 ID
    const [todoAiFilter, setTodoAiFilter] = useState('all');
    const [isAiImportOpen, setIsAiImportOpen] = useState(false);
    const [aiImportText, setAiImportText] = useState('');
    const [aiImportError, setAiImportError] = useState('');
    const [aiImportSuccessCount, setAiImportSuccessCount] = useState(0);
    const [aiClassifyText, setAiClassifyText] = useState('');
    const [aiClassifyError, setAiClassifyError] = useState('');
    const [aiClassifySuccessCount, setAiClassifySuccessCount] = useState(0);
    const [isClassifyPromptCopied, setIsClassifyPromptCopied] = useState(false);
    const [isPromptCopied, setIsPromptCopied] = useState(false);
    const [isTodoCopied, setIsTodoCopied] = useState(false);
    const [isBatchCopied, setIsBatchCopied] = useState(false);
    const [isCategoryTransferOpen, setIsCategoryTransferOpen] = useState(false);
    const [categoryTransferSourceId, setCategoryTransferSourceId] = useState('note');
    const [categoryTransferText, setCategoryTransferText] = useState('');
    const [categoryTransferError, setCategoryTransferError] = useState('');
    const [categoryTransferSuccessCount, setCategoryTransferSuccessCount] = useState(0);
    const [isCategoryPromptCopied, setIsCategoryPromptCopied] = useState(false);
    const [isCategoryContentCopied, setIsCategoryContentCopied] = useState(false);
    const [isCategoryTransferTargetOnly, setIsCategoryTransferTargetOnly] = useState(false);
    const [categoryTransferTargetId, setCategoryTransferTargetId] = useState('note');
    const [aiImportMode, setAiImportMode] = useState('prompt');
    const editorRef = useRef(null);
    const textareaRef = useRef(null); // Define textareaRef even if not used widely now
    const imageUploaderRef = useRef(null); // 图片上传组件引用
    const selectedCategoryConfig = useMemo(() => {
        return categories.find((cat) => cat.id === selectedCategory)
            || categories[0]
            || INSPIRATION_CATEGORIES[0];
    }, [categories, selectedCategory]);
    const selectedCategoryAccentHex = useMemo(
        () => resolveCategoryAccentHex(selectedCategoryConfig),
        [selectedCategoryConfig]
    );
    const selectedCategoryDividerLineStyle = useMemo(() => ({
        backgroundImage: `linear-gradient(to right, transparent, ${hexToRgba(selectedCategoryAccentHex, 0.55)}, transparent)`,
    }), [selectedCategoryAccentHex]);
    const selectedCategoryDividerTextStyle = useMemo(() => ({
        color: selectedCategoryAccentHex,
    }), [selectedCategoryAccentHex]);
    const selectedCategoryTitle = useMemo(() => {
        const matchedCategory = categories.find((cat) => cat.id === selectedCategory);
        return matchedCategory?.label || t('inspiration.title');
    }, [categories, selectedCategory, t]);

    usePageTitle(selectedCategoryTitle);

    // Sync route category to local state (route is source of truth when present).
    // Wait for the synced category catalog before validating the route, otherwise
    // custom categories can be misclassified as invalid during the initial refresh.
    useEffect(() => {
        if (categories.length === 0 || !routeCategoryId || !isCategoryCatalogHydrated) return;

        if (categories.some((cat) => cat.id === routeCategoryId)) {
            setSelectedCategory((prev) => (prev === routeCategoryId ? prev : routeCategoryId));
            return;
        }

        const fallback = resolveCategoryFallback(categories);
        if (fallback) {
            setSelectedCategory((prev) => (prev === fallback.id ? prev : fallback.id));
        }
    }, [categories, isCategoryCatalogHydrated, routeCategoryId]);

    // Ensure selected category remains valid even after category removal
    useEffect(() => {
        if (categories.length === 0 || !isCategoryCatalogHydrated) return;
        if (categories.some((cat) => cat.id === selectedCategory)) return;

        const fallback = resolveCategoryFallback(categories);
        if (fallback) {
            setSelectedCategory(fallback.id);
        }
    }, [categories, isCategoryCatalogHydrated, selectedCategory]);

    // Sync local selected category back to URL
    useEffect(() => {
        if (!selectedCategory) return;

        if (!isCategoryCatalogHydrated && routeCategoryId === selectedCategory) return;

        const targetPath = buildInspirationCategoryPath(selectedCategory);
        const currentPathWithSearch = `${location.pathname}${location.search || ''}`;
        const targetPathWithSearch = `${targetPath}${location.search || ''}`;

        if (currentPathWithSearch !== targetPathWithSearch) {
            navigate(targetPathWithSearch, { replace: true });
        }
    }, [isCategoryCatalogHydrated, location.pathname, location.search, navigate, routeCategoryId, selectedCategory]);

    useEffect(() => {
        if (categories.length === 0) return;
        if (!categories.find(c => c.id === categoryTransferSourceId)) {
            const fallback = categories.find(c => c.id === selectedCategory) || categories[0];
            if (fallback) setCategoryTransferSourceId(fallback.id);
        }
    }, [categories, categoryTransferSourceId, selectedCategory]);

    useEffect(() => {
        if (categories.length === 0) return;
        if (!categories.find(c => c.id === categoryTransferTargetId)) {
            const fallback = categories.find(c => c.id === selectedCategory) || categories[0];
            if (fallback) setCategoryTransferTargetId(fallback.id);
        }
    }, [categories, categoryTransferTargetId, selectedCategory]);

    // Autocomplete State
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [autocompleteQuery, setAutocompleteQuery] = useState('');
    const [autocompleteIndex, setAutocompleteIndex] = useState(0);


    // 多选处理逻辑
    // 多选处理逻辑
    const handleToggleSelect = useCallback((ideaId) => {
        setSelectedIdeaIds(prev =>
            prev.includes(ideaId)
                ? prev.filter(id => id !== ideaId)
                : [...prev, ideaId]
        );
    }, []);

    const selectedIdeaIdSet = useMemo(() => new Set(selectedIdeaIds), [selectedIdeaIds]);

    const handleBatchMove = useCallback((category) => {
        if (selectedIdeaIds.length === 0) return;

        selectedIdeaIds.forEach(id => {
            updateProjectBase(id, { category });
        });
        immediateSync?.();

        // 成功后退出多选模式
        setIsSelectionMode(false);
        setSelectedIdeaIds([]);
    }, [selectedIdeaIds, updateProjectBase, immediateSync]);

    const handleBatchDelete = useCallback(() => {
        if (selectedIdeaIds.length === 0) return;

        const selectedIdeas = ideas.filter((idea) => selectedIdeaIdSet.has(idea.id));
        if (selectedIdeas.length === 0) return;

        const confirmed = window.confirm(`确认删除已选 ${selectedIdeas.length} 项吗？可在 5 秒内撤销。`);
        if (!confirmed) return;

        setDeletedIdeas((prev) => [...prev, ...selectedIdeas]);

        selectedIdeas.forEach((idea) => {
            removeProjectBase(idea.id);
        });
        immediateSync?.();

        setIsSelectionMode(false);
        setSelectedIdeaIds([]);
    }, [selectedIdeaIds.length, selectedIdeaIdSet, ideas, removeProjectBase, immediateSync]);

    const allProjectTags = useMemo(() => {
        const tags = new Set();

        ideas.forEach((idea) => {
            const content = `${idea.content || ''}\n${idea.note || ''}`;
            const matches = content.matchAll(TAG_REGEX);

            for (const match of matches) {
                const tag = String(match?.[1] || '').trim();
                if (tag) tags.add(tag);
            }
        });

        return Array.from(tags).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));
    }, [ideas]);

    // Cleanup undo stack after 5s of inactivity
    useEffect(() => {
        if (deletedIdeas.length > 0) {
            const timer = setTimeout(() => {
                setDeletedIdeas([]);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [deletedIdeas]);

    // 跨项目内容接收：检测 URL 参数中的 import_text
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const importText = params.get('import_text');

        if (importText) {
            const decoded = decodeURIComponent(importText);
            handleImportedIdea({
                text: decoded,
                timestamp: Date.now(),
                source: 'external-share',
                order: 0
            });

            // 清理 URL 参数（避免刷新后重复创建）
            const url = new URL(window.location);
            url.searchParams.delete('import_text');
            window.history.replaceState({}, '', url);
        }
    }, [handleImportedIdea]);

    // Keyboard shortcut: Cmd+Z to undo
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Cmd+Z or Ctrl+Z to undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                if (deletedIdeas.length > 0) {
                    e.preventDefault();
                    const lastDeleted = deletedIdeas[deletedIdeas.length - 1];
                    addIdea(lastDeleted);
                    setDeletedIdeas(prev => prev.slice(0, -1));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deletedIdeas, addIdea]);

    // 粘贴图片上传支持
    useEffect(() => {
        const handlePaste = async (e) => {
            // 检查是否有图片在剪贴板中
            const hasImage = Array.from(e.clipboardData?.items || []).some(
                item => item.type.startsWith('image/')
            );

            if (hasImage && imageUploaderRef.current) {
                e.preventDefault();
                await imageUploaderRef.current.uploadFromClipboard(e.clipboardData);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const handleColorClick = useCallback((index) => {
        const colorConfig = COLOR_CONFIG[index];

        // 使用 contenteditable 的 applyColor 方法
        if (editorRef.current) {
            const applied = editorRef.current.applyColor(colorConfig.id);
            if (!applied) {
                // 如果没有选中文本，只更新激活颜色状态
                setSelectedColorIndex(prev => prev === index ? null : index);
            }
        }
    }, [editorRef]);

    const handleAdd = useCallback(() => {
        if (!input.trim()) return;
        const newIdea = {
            id: uuidv4(),
            content: input.trim(),
            timestamp: Date.now(),
            colorIndex: selectedColorIndex !== null ? selectedColorIndex : getNextAutoColorIndex(ideas.length),
            category: selectedCategory, // 添加分类
            ...(selectedCategory === 'todo' ? { aiAssistClass: TODO_AI_CLASS_UNCLASSIFIED } : {}),
            stage: 'inspiration',
        };
        addIdea(newIdea);
        setInput('');
        // 清空 contenteditable 编辑器
        if (editorRef.current) editorRef.current.clear();
    }, [input, selectedColorIndex, ideas.length, selectedCategory, addIdea]);

    const handleUpdateColor = useCallback((id, newColorIndex) => {
        updateIdea(id, { colorIndex: newColorIndex });
    }, [updateIdea]);

    const handleUpdateNote = useCallback((id, note) => {
        updateIdea(id, { note });
    }, [updateIdea]);

    const handleToggleComplete = useCallback((id, completed) => {
        updateIdea(id, { completed });
    }, [updateIdea]);

    const handleUpdateContent = useCallback((id, content) => {
        updateIdea(id, { content });
    }, [updateIdea]);

    const handleCopy = useCallback(async (idea) => {
        try {
            const { imageUrls, text, textWithoutImages } = buildIdeaCopyPayload(idea);
            const targetId = idea?.id;

            if (!text) return;

            if (imageUrls.length > 0) {
                // 复制第一张图片 + 文字到剪贴板
                const result = await copyImageToClipboard(imageUrls[0], textWithoutImages);
                if (result) {
                    setCopiedId(targetId);
                    setTimeout(() => setCopiedId(null), 2000);
                    return;
                }
            }

            // 无图片或图片复制失败：降级为纯文本复制
            const fallbackText = imageUrls.length > 0 ? (textWithoutImages || text) : text;
            await navigator.clipboard.writeText(fallbackText);
            setCopiedId(targetId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }, []);

    const handleRemove = useCallback((id) => {
        const idea = ideas.find(i => i.id === id);
        if (idea) {
            setDeletedIdeas(prev => [...prev, idea]);
            removeIdea(id);
        }
    }, [ideas, removeIdea]);

    const handleUndo = () => {
        if (deletedIdeas.length > 0) {
            const lastDeleted = deletedIdeas[deletedIdeas.length - 1];
            addIdea(lastDeleted);
            setDeletedIdeas(prev => prev.slice(0, -1));
        }
    };

    const handleTagClick = (projectTitle) => {
        const tag = `[${projectTitle}] `;
        setInput(prev => prev + tag);
        editorRef.current?.focus();
    };

    const handleImageUploadComplete = useCallback((imageUrl) => {
        setInput((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${imageUrl}` : imageUrl;
        });
    }, []);


    // --- Autocomplete Logic ---
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart;
        setInput(newValue);
        setCursorPosition(e.target.selectionStart);

        // Check for trigger character '['
        // logic: find the last occurrence of '[' before cursor
        const textBeforeCursor = newValue.substring(0, newCursorPos);
        const lastOpenBracketIndex = textBeforeCursor.lastIndexOf('[');

        if (lastOpenBracketIndex !== -1) {
            // Check if there is a closing bracket ']' after it before cursor
            const textSinceBracket = textBeforeCursor.substring(lastOpenBracketIndex + 1);
            if (!textSinceBracket.includes(']')) {
                // We are inside a potential tag
                setAutocompleteQuery(textSinceBracket);
                setShowAutocomplete(true);
                setAutocompleteIndex(0);
                return;
            }
        }
        setShowAutocomplete(false);
    };

    const filteredTags = useMemo(() => {
        if (!autocompleteQuery) return allProjectTags;
        return allProjectTags.filter(tag =>
            tag.toLowerCase().includes(autocompleteQuery.toLowerCase())
        );
    }, [allProjectTags, autocompleteQuery]);

    const insertTag = (tag) => {
        // Find position of last '['
        const textBeforeCursor = input.substring(0, cursorPosition);
        const lastOpenBracketIndex = textBeforeCursor.lastIndexOf('[');
        if (lastOpenBracketIndex !== -1) {
            const textAfterCursor = input.substring(cursorPosition);
            const newText = input.substring(0, lastOpenBracketIndex) + `[${tag}] ` + textAfterCursor;
            setInput(newText);
            setShowAutocomplete(false);
            // Focus and set cursor
            setTimeout(() => {
                if (editorRef.current) {
                    editorRef.current.focus();
                }
            }, 0);
        }
    };

    const handleKeyDown = (e) => {
        if (showAutocomplete && filteredTags.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setAutocompleteIndex(prev => (prev + 1) % filteredTags.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setAutocompleteIndex(prev => (prev - 1 + filteredTags.length) % filteredTags.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertTag(filteredTags[autocompleteIndex]);
                return;
            }
            if (e.key === 'Escape') {
                setShowAutocomplete(false);
                return;
            }
        }

        // 1. Submit: Cmd+Enter or Ctrl+Enter
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleAdd();
            return;
        }

        // 2. Atom Delete: If backspace at the end of a tag, delete the whole tag
        // Note: For contentEditable, this logic is more complex. For now, we skip it or use editorRef.
        if (e.key === 'Backspace' && editorRef.current) {
            // Simplified logic: normal backspace behavior for now
        }
    };

    const pendingTodoIdeas = useMemo(() => {
        return ideas
            .filter(idea =>
                (idea.category || 'note') === 'todo'
                && !idea.completed
            )
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }, [ideas]);

    const unclassifiedTodoIdeas = useMemo(() => {
        return ideas
            .filter(idea =>
                (idea.category || 'note') === 'todo'
                && !idea.completed
                && (idea.aiAssistClass || TODO_AI_CLASS_UNCLASSIFIED) === TODO_AI_CLASS_UNCLASSIFIED
            )
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }, [ideas]);

    const pendingTodoNumberedText = useMemo(() => {
        return pendingTodoIdeas
            .map((idea, index) => `${index + 1}. ${normalizeIdeaTextForExport(idea.content)}`)
            .filter(Boolean)
            .join('\n');
    }, [pendingTodoIdeas]);

    const unclassifiedTodoNumberedText = useMemo(() => {
        return unclassifiedTodoIdeas
            .map((idea, index) => `${index + 1}. ${normalizeIdeaTextForExport(idea.content)}`)
            .filter(Boolean)
            .join('\n');
    }, [unclassifiedTodoIdeas]);

    const aiPromptTemplate = useMemo(() => {
        return `你是任务结构化助手。请把我接下来输入的内容整理为可执行待办清单。输入可能来自：
- 语音听写（口语化、重复、断句混乱）
- 手写/OCR 识别（错字、漏字、符号错误）

处理规则（统一适用）：
1. 先做轻度纠错：只修正明显错别字、同音误识别、OCR 断词错误。
2. 允许“适度补全”：把过于残缺的短句补全成可执行动作，但不要改变原意，不要凭空新增任务。
3. 专有名词/书名/地名/链接尽量保留原文。
4. 去重并合并重复任务，最多输出 50 条。
5. 只输出清单，不要解释，不要标题，不要备注，不要代码块。
6. 每行一条，严格格式：数字+英文句点+空格+任务内容（例如：1. 完成首页线框图）。
7. 如果某一条无法识别内容，请保留序号并留空（例如：12. ），不要编造内容。

现在请基于我接下来给你的原始内容，直接输出最终清单。`;
    }, []);

    const aiClassifyPromptTemplate = useMemo(() => {
        return `你是任务分类助手。请将我给你的待办清单按以下四类分类：
1. AI 完成
2. AI 高度辅助
3. AI 中度辅助
4. 必须自己去完成

规则：
1. 不要改写任务内容，不要新增任务，不要删除任务。
2. 只输出“编号 + 分类”，每行一个，例如：1. AI 高度辅助
3. 分类名称必须严格使用这四个词中的一个。
4. 不要输出解释、标题、代码块或其他文本。

待分类清单：
${unclassifiedTodoNumberedText || '暂无未分类待办'}
`;
    }, [unclassifiedTodoNumberedText]);

    const copyTextToClipboard = useCallback(async (text) => {
        if (!text || !text.trim()) return false;

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }

            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (error) {
            console.error('Failed to copy text:', error);
            return false;
        }
    }, []);

    const parseAiTodoOutput = useCallback((rawText) => {
        if (!rawText || !rawText.trim()) return [];

        const normalized = rawText
            .replace(/\r\n?/g, '\n')
            .replace(/```[\w-]*\n?/g, '')
            .replace(/```/g, '')
            .replace(/^>\s?/gm, '')
            .replace(/\u00a0/g, ' ')
            .replace(/\t/g, ' ')
            .trim();

        if (!normalized) return [];

        const output = [];
        const BLANK_PLACEHOLDER = '\u200B';
        let placeholderCount = 0;

        const getBlankPlaceholder = () => {
            placeholderCount += 1;
            return BLANK_PLACEHOLDER.repeat(placeholderCount);
        };

        const isNumberedLikeLine = (line) => {
            const source = String(line || '').trim();
            if (!source) return false;
            return /^([（(]?\d+[）)]?|[一二三四五六七八九十百]+|[①②③④⑤⑥⑦⑧⑨⑩])\s*[.)、:：-]?\s*$/.test(source)
                || /^([（(]?\d+[）)]?|[一二三四五六七八九十百]+|[①②③④⑤⑥⑦⑧⑨⑩])\s*[.)、:：-]\s*/.test(source);
        };

        const pushTask = (line) => {
            const originalLine = String(line || '');
            let cleaned = String(line || '')
                .replace(/^\s*[-*•·]\s+/, '')
                .replace(/^\s*\[[xX ]\]\s*/, '')
                .replace(/^\s*✅\s*/, '')
                .replace(/^\s*[（(]?\d+[）)]\s*/, '')
                .replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
                .replace(/^\s*[一二三四五六七八九十百]+\s*[、.．]\s*/, '')
                .replace(/^\s*\d+\s*[.)。、:：-]\s*/, '')
                .replace(/^#+\s*/, '')
                .replace(/^\s*(任务|代办|清单|todo|todos)\s*[:：]?\s*/i, '')
                .replace(/[；;。]+$/g, '')
                .trim();

            cleaned = normalizeIdeaTextForExport(cleaned);
            if (!cleaned) {
                if (isNumberedLikeLine(originalLine)) {
                    output.push(getBlankPlaceholder());
                }
                return;
            }
            if (/^(输出|说明|备注|注意|以下|最终清单|任务清单)$/i.test(cleaned)) return;
            output.push(cleaned);
        };

        normalized
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .forEach(pushTask);

        if (output.length <= 1) {
            const inlineMatches = [...normalized.matchAll(/(?:^|\s)(?:\d+|[一二三四五六七八九十]+|[①②③④⑤⑥⑦⑧⑨⑩])\s*[.)、:：-]\s*([^。\n；;]+(?:[。；;]|$))/g)];
            if (inlineMatches.length > 1) {
                inlineMatches.forEach(match => pushTask(match[1]));
            }
        }

        if (output.length <= 1 && /[；;。|｜]/.test(normalized)) {
            normalized.split(/[；;。|｜]/).forEach(pushTask);
        }

        const deduped = [];
        const seen = new Set();

        output.forEach((task) => {
            if (/^\u200B+$/.test(task)) {
                deduped.push(task);
                return;
            }

            if (!seen.has(task)) {
                seen.add(task);
                deduped.push(task);
            }
        });

        if (deduped.length === 0 && normalized.length > 0) {
            deduped.push(getBlankPlaceholder());
        }

        return deduped.slice(0, 100);
    }, []);

    const handleCopyPrompt = useCallback(async () => {
        setAiImportMode('prompt');
        const success = await copyTextToClipboard(aiPromptTemplate);
        if (success) {
            setIsPromptCopied(true);
            setTimeout(() => setIsPromptCopied(false), 1500);
            setAiImportError('');
        } else {
            setAiImportError('提示词复制失败，请手动复制。');
        }
    }, [aiPromptTemplate, copyTextToClipboard]);

    const handleCopyPendingTodos = useCallback(async () => {
        setAiImportMode('todo');
        if (!pendingTodoNumberedText) {
            setAiImportError('当前没有未办清单可复制。');
            return;
        }

        const success = await copyTextToClipboard(pendingTodoNumberedText);
        if (success) {
            setIsTodoCopied(true);
            setTimeout(() => setIsTodoCopied(false), 1500);
            setAiImportError('');
        } else {
            setAiImportError('未办清单复制失败，请手动复制。');
        }
    }, [copyTextToClipboard, pendingTodoNumberedText]);

    const handleCopyClassifyPrompt = useCallback(async () => {
        setAiImportMode('classify');
        if (!unclassifiedTodoNumberedText) {
            setAiClassifyError('当前没有可分类的未分类代办。');
            return;
        }

        const success = await copyTextToClipboard(aiClassifyPromptTemplate);
        if (success) {
            setIsClassifyPromptCopied(true);
            setTimeout(() => setIsClassifyPromptCopied(false), 1500);
            setAiClassifyError('');
        } else {
            setAiClassifyError('分类提示词复制失败，请手动复制。');
        }
    }, [copyTextToClipboard, aiClassifyPromptTemplate, unclassifiedTodoNumberedText]);

    const handleAiImportModeChange = useCallback((nextMode) => {
        setAiImportMode(nextMode);

        if (nextMode === 'classify') {
            setAiImportError('');
            setAiImportSuccessCount(0);
            return;
        }

        setAiClassifyError('');
        setAiClassifySuccessCount(0);
    }, []);

    const handleApplyAiClassification = useCallback(() => {
        if (!aiClassifyText.trim()) {
            setAiClassifyError('请先粘贴 AI 分类结果。');
            setAiClassifySuccessCount(0);
            return;
        }

        if (unclassifiedTodoIdeas.length === 0) {
            setAiClassifyError('当前没有未分类代办可导入。');
            setAiClassifySuccessCount(0);
            return;
        }

        const lines = aiClassifyText
            .replace(/\r\n?/g, '\n')
            .replace(/```[\w-]*\n?/g, '')
            .replace(/```/g, '')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

        const resolveClassFromLine = (line) => {
            const normalized = line.replace(/\s+/g, '');
            if (/AI完成/.test(normalized)) return 'ai_done';
            if (/AI高度辅助|高度辅助/.test(normalized)) return 'ai_high';
            if (/AI中度辅助|中度辅助/.test(normalized)) return 'ai_mid';
            if (/必须自己去完成|必须自己完成|自己去完成|自己完成|人工完成/.test(normalized)) return 'self';
            return null;
        };

        const assignments = [];
        let sequentialIndex = 0;

        lines.forEach((line) => {
            const matchedClass = resolveClassFromLine(line);
            if (!matchedClass) return;

            const numMatch = line.match(/^\s*(\d+)\s*[.)、:：-]/);
            let targetIndex = sequentialIndex;

            if (numMatch) {
                targetIndex = Number(numMatch[1]) - 1;
                sequentialIndex = Math.max(sequentialIndex, targetIndex + 1);
            } else {
                sequentialIndex += 1;
            }

            if (targetIndex < 0 || targetIndex >= unclassifiedTodoIdeas.length) return;
            assignments.push({ index: targetIndex, aiAssistClass: matchedClass });
        });

        const latestByIndex = new Map();
        assignments.forEach(item => latestByIndex.set(item.index, item.aiAssistClass));

        if (latestByIndex.size === 0) {
            setAiClassifyError('没有识别到有效分类，请确保每行包含四个分类之一。');
            setAiClassifySuccessCount(0);
            return;
        }

        let updated = 0;
        latestByIndex.forEach((aiAssistClass, index) => {
            const targetIdea = unclassifiedTodoIdeas[index];
            if (!targetIdea) return;
            updateIdea(targetIdea.id, { aiAssistClass });
            updated += 1;
        });

        setAiClassifyError('');
        setAiClassifySuccessCount(updated);
        setAiClassifyText('');
    }, [aiClassifyText, unclassifiedTodoIdeas, updateIdea]);

    const handleCopySelectedIdeas = useCallback(async () => {
        if (selectedIdeaIds.length === 0) return;

        const selectedIdeas = ideas
            .filter((idea) => selectedIdeaIdSet.has(idea.id))
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        const numberedText = buildNumberedIdeaClipboardText(selectedIdeas);

        if (!numberedText) return;

        const success = await copyTextToClipboard(numberedText);
        if (success) {
            setIsBatchCopied(true);
            setTimeout(() => setIsBatchCopied(false), 1500);
        }
    }, [selectedIdeaIds.length, selectedIdeaIdSet, ideas, copyTextToClipboard]);

    const categoryIdeasMap = useMemo(() => {
        const groupedIdeas = new Map();

        ideas.forEach((idea) => {
            const categoryId = idea.category || 'note';
            if (!groupedIdeas.has(categoryId)) {
                groupedIdeas.set(categoryId, []);
            }
            groupedIdeas.get(categoryId).push(idea);
        });

        groupedIdeas.forEach((categoryIdeas) => {
            categoryIdeas.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });

        return groupedIdeas;
    }, [ideas]);

    const categoryTransferSourceCategory = useMemo(() => {
        return categories.find(cat => cat.id === categoryTransferSourceId) || categories[0] || null;
    }, [categories, categoryTransferSourceId]);

    const categoryTransferTargetCategory = useMemo(() => {
        return categories.find(cat => cat.id === categoryTransferTargetId) || categories[0] || null;
    }, [categories, categoryTransferTargetId]);

    const categoryTransferIdeas = useMemo(() => {
        return ideas
            .filter(idea => (idea.category || 'note') === categoryTransferSourceId)
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }, [ideas, categoryTransferSourceId]);

    const categoryTransferNumberedText = useMemo(() => {
        return buildCategoryExportText(categoryTransferIdeas);
    }, [categoryTransferIdeas]);

    const categoryTransferPrompt = useMemo(() => {
        return buildCategoryTransferPrompt({
            sourceCategoryLabel: categoryTransferSourceCategory?.label || '当前分类',
            categories,
            numberedIdeasText: categoryTransferNumberedText,
        });
    }, [categoryTransferSourceCategory, categories, categoryTransferNumberedText]);

    const handleCopyCategorySnapshot = useCallback(async (categoryId) => {
        const targetCategoryId = categoryId || selectedCategory;
        const targetCategory = categories.find((cat) => cat.id === targetCategoryId) || selectedCategoryConfig;
        const categoryIdeas = categoryIdeasMap.get(targetCategoryId) || [];

        if (categoryIdeas.length === 0) {
            toast.error(`「${targetCategory?.label || '当前分类'}」暂时没有可复制内容`);
            return;
        }

        const clipboardText = buildCategoryClipboardText({
            categoryLabel: targetCategory?.label || '当前分类',
            ideas: categoryIdeas,
        });

        const success = await copyTextToClipboard(clipboardText);
        if (!success) {
            toast.error('分类内容复制失败，请再试一次');
            return;
        }

        toast.success(`已复制「${targetCategory?.label || '当前分类'}」分类（${categoryIdeas.length} 条）`);
    }, [
        categoryIdeasMap,
        categories,
        copyTextToClipboard,
        selectedCategory,
        selectedCategoryConfig,
    ]);

    const handleOpenCategoryTransfer = useCallback(() => {
        const fallback = categories.find(c => c.id === selectedCategory) || categories[0];
        const devCategory = categories.find((cat) => {
            const normalized = String(cat?.label || cat?.id || '').toLowerCase();
            return normalized.includes('开发') || normalized.includes('development') || normalized === 'dev';
        });
        if (fallback) {
            setCategoryTransferSourceId(fallback.id);
            setCategoryTransferTargetId(devCategory?.id || fallback.id);
        }
        setIsCategoryTransferTargetOnly(false);
        setCategoryTransferText('');
        setCategoryTransferError('');
        setCategoryTransferSuccessCount(0);
        setIsCategoryTransferOpen(true);
    }, [categories, selectedCategory]);

    const handleCopyCategoryTransferPrompt = useCallback(async () => {
        if (categoryTransferIdeas.length === 0) {
            setCategoryTransferError('当前分类没有可导出的内容。');
            return;
        }

        const success = await copyTextToClipboard(categoryTransferPrompt);
        if (success) {
            setIsCategoryPromptCopied(true);
            setTimeout(() => setIsCategoryPromptCopied(false), 1500);
            setCategoryTransferError('');
        } else {
            setCategoryTransferError('分类指令复制失败，请手动复制。');
        }
    }, [categoryTransferIdeas.length, categoryTransferPrompt, copyTextToClipboard]);

    const handleCopyCategoryTransferContent = useCallback(async () => {
        if (!categoryTransferNumberedText.trim()) {
            setCategoryTransferError('当前分类没有可复制的内容。');
            return;
        }

        const success = await copyTextToClipboard(categoryTransferNumberedText);
        if (success) {
            setIsCategoryContentCopied(true);
            setTimeout(() => setIsCategoryContentCopied(false), 1500);
            setCategoryTransferError('');
        } else {
            setCategoryTransferError('分类内容复制失败，请手动复制。');
        }
    }, [categoryTransferNumberedText, copyTextToClipboard]);

    const handleApplyCategoryTransfer = useCallback(() => {
        if (!categoryTransferText.trim()) {
            setCategoryTransferError('请先粘贴 AI 分类结果。');
            setCategoryTransferSuccessCount(0);
            return;
        }

        if (categoryTransferIdeas.length === 0) {
            setCategoryTransferError('当前分类没有可导入的内容。');
            setCategoryTransferSuccessCount(0);
            return;
        }

        const assignments = parseCategoryTransferOutput({
            rawText: categoryTransferText,
            categories,
            maxIndex: categoryTransferIdeas.length,
        });

        if (assignments.length === 0) {
            setCategoryTransferError('没有识别到有效分类，请确认输出格式为“编号. 分类名”。');
            setCategoryTransferSuccessCount(0);
            return;
        }

        const appliedAssignments = isCategoryTransferTargetOnly
            ? assignments.filter(item => item.categoryId === categoryTransferTargetId)
            : assignments;

        if (appliedAssignments.length === 0) {
            const targetLabel = categories.find(cat => cat.id === categoryTransferTargetId)?.label || '目标分类';
            setCategoryTransferError(`已解析分类结果，但没有识别到“${targetLabel}”条目。`);
            setCategoryTransferSuccessCount(0);
            return;
        }

        let moved = 0;
        appliedAssignments.forEach(({ index, categoryId }) => {
            const targetIdea = categoryTransferIdeas[index];
            if (!targetIdea) return;
            const currentCategory = targetIdea.category || 'note';
            if (currentCategory === categoryId) return;
            updateIdea(targetIdea.id, { category: categoryId });
            moved += 1;
        });

        if (moved === 0) {
            setCategoryTransferError('已解析分类结果，但没有条目需要迁移。');
            setCategoryTransferSuccessCount(0);
            return;
        }

        setCategoryTransferError('');
        setCategoryTransferSuccessCount(moved);
        setCategoryTransferText('');
    }, [
        categoryTransferText,
        categories,
        categoryTransferIdeas,
        isCategoryTransferTargetOnly,
        categoryTransferTargetId,
        updateIdea,
    ]);

    const handleOpenAiImport = useCallback(async () => {
        setIsAiImportOpen(true);
        setAiImportError('');
        setAiImportSuccessCount(0);
        setAiClassifyError('');
        setAiClassifySuccessCount(0);
        setAiImportMode('prompt');
        await handleCopyPrompt();
    }, [handleCopyPrompt]);

    const handleAiImportTextChange = useCallback((value) => {
        setAiImportText(value);
        if (aiImportError) setAiImportError('');
    }, [aiImportError]);

    const handleAiClassifyTextChange = useCallback((value) => {
        setAiClassifyText(value);
        if (aiClassifyError) setAiClassifyError('');
    }, [aiClassifyError]);

    const handleBatchImportFromAi = useCallback(() => {
        const tasks = parseAiTodoOutput(aiImportText);

        if (tasks.length === 0) {
            setAiImportError('没有识别到可导入的任务，请确认 AI 输出为“每行一个任务”或“数字编号列表”。');
            setAiImportSuccessCount(0);
            return;
        }

        const now = Date.now();
        const newIdeas = tasks.map((task, index) => ({
            id: uuidv4(),
            content: task,
            timestamp: now + (tasks.length - index),
            colorIndex: getNextAutoColorIndex(ideas.length + index),
            category: 'todo',
            aiAssistClass: TODO_AI_CLASS_UNCLASSIFIED,
            completed: false,
            stage: 'inspiration',
            source: 'ai-import',
        }));

        addIdeasBatch(newIdeas);
        setSelectedCategory('todo');
        setAiImportText('');
        setAiImportError('');
        setAiImportSuccessCount(newIdeas.length);
    }, [aiImportText, parseAiTodoOutput, ideas.length, addIdeasBatch]);

    const getTodoAiAssistClass = useCallback((idea) => {
        return idea.aiAssistClass || TODO_AI_CLASS_UNCLASSIFIED;
    }, []);

    const todoIdeas = useMemo(() => {
        return [...ideas]
            .filter(idea => (idea.category || 'note') === 'todo')
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [ideas]);

    const todoAiFilterCounts = useMemo(() => {
        const counts = {
            all: todoIdeas.length,
            [TODO_AI_FILTER_PENDING]: 0,
            [TODO_AI_CLASS_UNCLASSIFIED]: 0,
            ai_done: 0,
            ai_high: 0,
            ai_mid: 0,
            self: 0,
        };

        todoIdeas.forEach((idea) => {
            if (idea.completed) return;
            counts[TODO_AI_FILTER_PENDING] += 1;
            const aiClass = getTodoAiAssistClass(idea);
            if (Object.hasOwn(counts, aiClass)) {
                counts[aiClass] += 1;
            } else {
                counts[TODO_AI_CLASS_UNCLASSIFIED] += 1;
            }
        });

        return counts;
    }, [todoIdeas, getTodoAiAssistClass]);

    const filteredTodoIdeas = useMemo(() => {
        if (todoAiFilter === 'all') return todoIdeas;
        if (todoAiFilter === TODO_AI_FILTER_PENDING) {
            return todoIdeas.filter(idea => !idea.completed);
        }

        if (todoAiFilter === TODO_AI_CLASS_UNCLASSIFIED) {
            return todoIdeas.filter(idea =>
                !idea.completed && getTodoAiAssistClass(idea) === TODO_AI_CLASS_UNCLASSIFIED
            );
        }

        return todoIdeas.filter(idea =>
            !idea.completed && getTodoAiAssistClass(idea) === todoAiFilter
        );
    }, [todoIdeas, todoAiFilter, getTodoAiAssistClass]);

    // Sort ideas by timestamp (memoized) and filter by category
    const sortedIdeas = useMemo(() => {
        if (selectedCategory === 'todo') {
            return filteredTodoIdeas;
        }

        return [...ideas]
            .filter(idea => (idea.category || 'note') === selectedCategory)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }, [ideas, selectedCategory, filteredTodoIdeas]);

    // 智能日期格式化函数（代办分类专用）
    const formatDayLabel = useCallback((date) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.floor((today - targetDay) / (24 * 60 * 60 * 1000));

        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays < 7) {
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            return weekdays[date.getDay()];
        }
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
        }
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    }, []);

    // 代办分类按天分组数据
    const todosByDay = useMemo(() => {
        if (selectedCategory !== 'todo') return null;

        const groups = {};
        filteredTodoIdeas.forEach(idea => {
            const date = new Date(idea.timestamp || Date.now());
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            if (!groups[dateKey]) {
                groups[dateKey] = {
                    date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                    dateKey,
                    ideas: []
                };
            }
            groups[dateKey].ideas.push(idea);
        });

        return Object.values(groups).sort((a, b) => b.date - a.date);
    }, [filteredTodoIdeas, selectedCategory]);

    const visibleIdeaCount = useMemo(() => {
        if (selectedCategory === 'todo') return filteredTodoIdeas.length;
        return sortedIdeas.length;
    }, [selectedCategory, filteredTodoIdeas.length, sortedIdeas.length]);

    const recentIdeas = useMemo(() => {
        if (selectedCategory === 'todo') return [];
        return sortedIdeas.filter((idea) => Date.now() - (idea.timestamp || Date.now()) < 7 * 24 * 60 * 60 * 1000);
    }, [selectedCategory, sortedIdeas]);

    const olderIdeaGroups = useMemo(() => {
        if (selectedCategory === 'todo') return [];

        const weekGroups = {};
        sortedIdeas.forEach((idea) => {
            if (Date.now() - (idea.timestamp || Date.now()) < 7 * 24 * 60 * 60 * 1000) {
                return;
            }

            const date = new Date(idea.timestamp || Date.now());
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(date.setDate(diff));
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const weekKey = weekStart.getTime();
            if (!weekGroups[weekKey]) {
                weekGroups[weekKey] = {
                    key: weekKey,
                    start: weekStart,
                    end: weekEnd,
                    ideas: []
                };
            }
            weekGroups[weekKey].ideas.push(idea);
        });

        return Object.values(weekGroups).sort((a, b) => b.start - a.start);
    }, [selectedCategory, sortedIdeas]);

    // Extract all available weeks for navigation, grouped by Year and Month
    const groupedWeeks = useMemo(() => {
        const groups = {};

        olderIdeaGroups.forEach((week) => {
            const weekStart = new Date(week.start.getTime());
            const year = weekStart.getFullYear();
            const month = weekStart.getMonth() + 1;

            if (!groups[year]) groups[year] = {};
            if (!groups[year][month]) groups[year][month] = [];

            if (!groups[year][month].some((existingWeek) => existingWeek.key === week.key)) {
                const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
                const weekNum = Math.ceil((weekStart.getDate() + monthStart.getDay() - 1) / 7);
                const weekNames = ['第一周', '第二周', '第三周', '第四周', '第五周', '第六周'];

                groups[year][month].push({
                    start: week.start,
                    end: week.end,
                    key: week.key,
                    label: weekNames[weekNum - 1] || `${weekNum}周`
                });
            }
        });

        // 转换为排序后的结构
        return Object.entries(groups)
            .sort((a, b) => Number(b[0]) - Number(a[0])) // 年份降序
            .map(([year, months]) => ({
                year,
                months: Object.entries(months)
                    .sort((a, b) => Number(b[0]) - Number(a[0])) // 月份降序
                    .map(([month, weeks]) => ({
                        month,
                        weeks: weeks.sort((a, b) => b.key - a.key)
                    }))
            }));
    }, [olderIdeaGroups]);

    const scrollToWeek = (weekKey) => {
        const element = document.getElementById(`week-${weekKey}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setShowWeekSelector(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pt-14 px-6 md:px-10 pb-32 overflow-x-hidden overscroll-x-none">
            {/* Header Section */}
            <div className="mb-14 text-center md:text-left">
                <motion.div
                    className="inline-flex items-center justify-center md:justify-start gap-2 mb-3"
                >
                    <motion.div className="p-2 rounded-xl accent-surface">
                        <Lightbulb className="w-5 h-5 accent-text-soft" />
                    </motion.div>
                    <h2
                        onDoubleClick={() => navigate('/inspiration/archive')}
                        className="text-3xl font-light tracking-tight relative inline-block cursor-pointer hover:opacity-80 transition-opacity accent-text-soft"
                    >
                        {t('inspiration.title')}
                        <span className="absolute -bottom-1 left-0 w-full h-2 accent-brush rounded-full blur-[2px]" />
                    </h2>
                </motion.div>

                <p className="text-gray-500 dark:text-gray-400 text-base font-light tracking-wide max-w-md mx-auto md:mx-0 leading-relaxed mb-6">
                    {t('inspiration.subtitle')}
                </p>
            </div>



            <AnimatePresence mode="wait">
                <motion.div
                    key="inspiration"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Input Section */}
                    <div className="relative mb-20 group z-30">
                        <Spotlight className="rounded-2xl accent-focus-shell" spotColor="var(--accent-spotlight)">
                            <div className="absolute -inset-1 bg-gradient-to-r from-gray-100 dark:from-gray-800 via-gray-50 dark:via-gray-900 to-gray-100 dark:to-gray-800 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_20px_-4px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-800 overflow-visible transition-all duration-300 group-hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.08)] dark:group-hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.4)] group-hover:border-gray-200 dark:group-hover:border-gray-700">

                                {/* 富文本输入框 - 使用 contenteditable 实现 */}
                                <RichTextInput
                                    ref={editorRef}
                                    value={input}
                                    onChange={setInput}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('inspiration.placeholder')}
                                    className="w-full bg-transparent text-lg text-gray-800 dark:text-gray-100 outline-none p-6 pb-20 min-h-[200px] font-light leading-relaxed relative z-10 break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400/50"
                                    style={{
                                        fontFamily: 'inherit',
                                        lineHeight: '1.625',
                                        letterSpacing: 'normal',
                                        fontVariantLigatures: 'none',
                                        WebkitFontSmoothing: 'antialiased',
                                        MozOsxFontSmoothing: 'grayscale',
                                        caretColor: 'var(--accent-500)',
                                    }}
                                />

                                {/* Autocomplete Popover */}
                                <AnimatePresence>
                                    {showAutocomplete && filteredTags.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute left-6 z-50 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 p-1 min-w-[200px] max-h-[200px] overflow-y-auto"
                                            style={{
                                                top: 'auto', // Dynamic positioning would require more complex calc, ensuring it shows below input or "near cursor"
                                                bottom: '80px', // Show above toolbar
                                                boxShadow: `0 16px 28px -20px rgb(var(--accent-rgb) / ${isDark ? '0.24' : '0.20'})`,
                                            }}
                                        >
                                            <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                Link Project
                                            </div>
                                            {filteredTags.map((tag, index) => (
                                                <button
                                                    key={tag}
                                                    onClick={() => insertTag(tag)}
                                                    className={`
                                                w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2
                                                ${index === autocompleteIndex
                                                            ? 'text-gray-900 dark:text-white'
                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                                            `}
                                                    style={index === autocompleteIndex
                                                        ? { backgroundColor: 'var(--accent-soft-bg)', color: isDark ? 'var(--accent-300)' : 'var(--accent-600)' }
                                                        : undefined}
                                                >
                                                    <Hash size={12} className="opacity-50" />
                                                    {tag}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Bottom Action Area */}
                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 z-20">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        {/* Minimal Color Picker */}
                                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50/50 dark:bg-gray-800/50 rounded-full border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm flex-shrink-0">
                                            {COLOR_CONFIG.map((conf, index) => (
                                                <button
                                                    key={conf.id}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleColorClick(index)}
                                                    className={`relative w-3 h-3 rounded-full transition-all duration-300 ${conf.dot} ${index === selectedColorIndex ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 ring-gray-400 dark:ring-gray-500 scale-110' : 'opacity-40 hover:opacity-100 hover:scale-110'} after:absolute after:-inset-2`}
                                                    title={conf.id}
                                                />
                                            ))}
                                        </div>

                                        {/* Image Upload Button */}
                                        <ImageUploader
                                            ref={imageUploaderRef}
                                            onUploadComplete={handleImageUploadComplete}
                                        />

                                        {/* Project Tags Bar */}
                                        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 mask-linear-fade">
                                            {allProjectTags.length > 0 && (
                                                <>
                                                    <Hash size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                                    {allProjectTags.map((tag) => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => handleTagClick(tag)}
                                                            className="flex-shrink-0 px-2 py-1 accent-chip rounded-md text-[11px] font-medium transition-all duration-300 whitespace-nowrap"
                                                        >
                                                            {tag}
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono hidden md:inline-block">
                                            {t('inspiration.cmdEnter')}
                                        </span>
                                        <button
                                            onClick={handleAdd}
                                            disabled={!input.trim()}
                                            className="flex items-center justify-center p-3 accent-button rounded-xl disabled:opacity-30 transition-all duration-300 active:scale-95"
                                        >
                                            <ArrowRight size={18} strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Spotlight>
                    </div>

                    {/* Category Selector - Redesigned: Capsule with Name & Dots */}
                    <div className="flex justify-end mb-6 -mt-12 px-2 relative z-20 gap-3 items-center">
                        {/* Selection Toggle */}
                        <button
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                if (isSelectionMode) setSelectedIdeaIds([]); // 退出时清空选中
                            }}
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-300 backdrop-blur-md md:h-auto md:w-auto md:gap-1.5 md:px-3 md:py-2 ${isSelectionMode
                                ? 'bg-blue-500/16 border-blue-300 text-blue-500 shadow-sm'
                                : 'bg-white/60 dark:bg-gray-800/40 border-gray-100/70 dark:border-gray-800/60 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                            title={isSelectionMode ? "退出多选" : "开启多选"}
                        >
                            {isSelectionMode ? <X size={18} /> : <ListChecks size={18} />}
                            <span className="hidden text-xs font-medium whitespace-nowrap md:inline">
                                {isSelectionMode ? '退出' : '多选'}
                            </span>
                        </button>

                        <InspirationCategorySelector
                            categories={categories}
                            selectedCategory={selectedCategory}
                            onSelectCategory={setSelectedCategory}
                            onOpenManager={() => setCategoryManagerOpen(true)}
                            onCategoryDoubleClick={handleCopyCategorySnapshot}
                        />

                        {selectedCategory === 'todo' && (
                            <button
                                type="button"
                                onClick={handleOpenAiImport}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full accent-chip text-xs font-medium transition-colors"
                            >
                                <Sparkles size={12} />
                                <span>AI 批量导入</span>
                            </button>
                        )}
                    </div>

                    {selectedCategory === 'todo' && (
                        <div className="mb-6 -mt-2 px-2">
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                {TODO_AI_FILTER_OPTIONS.map((option) => {
                                    const count = todoAiFilterCounts[option.value] || 0;
                                    const isActive = todoAiFilter === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() => setTodoAiFilter(option.value)}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${isActive
                                                ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                                : 'bg-white/70 dark:bg-gray-900/60 text-blue-500 dark:text-blue-300 border-blue-100 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                                }`}
                                        >
                                            {option.label}
                                            <span className={`ml-1.5 ${isActive ? 'text-white/85' : 'text-blue-400 dark:text-blue-400'}`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* List Section - Improved overall transition */}
                    <div className="relative min-h-[400px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedCategory === 'todo' ? `${selectedCategory}-${todoAiFilter}` : selectedCategory}
                                initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -15, filter: "blur(8px)" }}
                                transition={{
                                    duration: 0.4,
                                    ease: [0.23, 1, 0.32, 1] // Apple Style Ease Out
                                }}
                                className="space-y-6"
                            >
                                {/* 代办分类：按天分组显示 */}
                                {selectedCategory === 'todo' && todosByDay && (
                                    <div className="space-y-4">
                                        {todosByDay.map((day, dayIndex) => (
                                            <div key={day.dateKey}>
                                                {/* 日期分隔线 - 跟随当前分类主题色 */}
                                                <div className="flex items-center gap-3 mb-4 mt-6">
                                                    <div
                                                        className="h-px flex-1"
                                                        style={selectedCategoryDividerLineStyle}
                                                    />
                                                    <span
                                                        className="text-xs font-medium tracking-wide whitespace-nowrap"
                                                        style={selectedCategoryDividerTextStyle}
                                                    >
                                                        {formatDayLabel(day.date)}
                                                    </span>
                                                    <div
                                                        className="h-px flex-1"
                                                        style={selectedCategoryDividerLineStyle}
                                                    />
                                                </div>
                                                <div className="space-y-4">
                                                    <AnimatePresence mode="popLayout" initial={false}>
                                                        {day.ideas.map((idea) => (
                                                            <InspirationItem
                                                                key={idea.id}
                                                                idea={idea}
                                                                categories={categoryConfigList}
                                                                onDelete={handleRemove}
                                                                onCopy={handleCopy}
                                                                onUpdateColor={handleUpdateColor}
                                                                onUpdateNote={handleUpdateNote}
                                                                onUpdateContent={handleUpdateContent}
                                                                onToggleComplete={handleToggleComplete}
                                                                copiedId={copiedId}
                                                                isSelectionMode={isSelectionMode}
                                                                isSelected={selectedIdeaIdSet.has(idea.id)}
                                                                onSelect={handleToggleSelect}
                                                            />
                                                        ))}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 其他分类：原有逻辑（最近7天平铺 + 更早按周分组） */}
                                {selectedCategory !== 'todo' && (
                                    <>
                                        <div className="space-y-6">
                                            <AnimatePresence mode="popLayout" initial={false}>
                                                {recentIdeas.map((idea) => (
                                                        <InspirationItem
                                                            key={idea.id}
                                                            idea={idea}
                                                            categories={categoryConfigList}
                                                            onDelete={handleRemove}
                                                            onCopy={handleCopy}
                                                            onUpdateColor={handleUpdateColor}
                                                            onUpdateNote={handleUpdateNote}
                                                            onUpdateContent={handleUpdateContent}
                                                            onToggleComplete={handleToggleComplete}
                                                            copiedId={copiedId}
                                                            isSelectionMode={isSelectionMode}
                                                            isSelected={selectedIdeaIdSet.has(idea.id)}
                                                            onSelect={handleToggleSelect}
                                                        />
                                                    ))}
                                            </AnimatePresence>
                                        </div>

                                        {/* 更早的项目 - 按周分组 */}
                                        {olderIdeaGroups.length > 0 && olderIdeaGroups.map((week) => (
                                                <div key={week.key} id={`week-${week.key}`}>
                                                    <div className="flex items-center gap-3 mb-4 mt-8 cursor-pointer group">
                                                        <div
                                                            className="h-px flex-1 transition-opacity group-hover:opacity-90"
                                                            style={selectedCategoryDividerLineStyle}
                                                        />
                                                        <span
                                                            className="text-xs font-medium tracking-wide whitespace-nowrap transition-opacity group-hover:opacity-90"
                                                            style={selectedCategoryDividerTextStyle}
                                                        >
                                                            {week.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            {' - '}
                                                            {week.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <div
                                                            className="h-px flex-1 transition-opacity group-hover:opacity-90"
                                                            style={selectedCategoryDividerLineStyle}
                                                        />
                                                    </div>
                                                    <div className="space-y-6">
                                                        <AnimatePresence mode="popLayout" initial={false}>
                                                            {week.ideas.map((idea) => (
                                                                <InspirationItem
                                                                    key={idea.id}
                                                                    idea={idea}
                                                                    categories={categoryConfigList}
                                                                    onDelete={handleRemove}
                                                                    onCopy={handleCopy}
                                                                    onUpdateColor={handleUpdateColor}
                                                                    onUpdateNote={handleUpdateNote}
                                                                    onUpdateContent={handleUpdateContent}
                                                                    onToggleComplete={handleToggleComplete}
                                                                    copiedId={copiedId}
                                                                    isSelectionMode={isSelectionMode}
                                                                    isSelected={selectedIdeaIdSet.has(idea.id)}
                                                                    onSelect={handleToggleSelect}
                                                                />
                                                            ))}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            ))}
                                    </>
                                )}

                                {visibleIdeaCount === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="py-32 text-center"
                                    >
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Lightbulb className="text-gray-300 dark:text-gray-600" size={24} />
                                        </div>
                                        <p className="text-gray-400 dark:text-gray-500 text-sm font-light tracking-wide">
                                            {t('inspiration.emptyState')}
                                        </p>
                                    </motion.div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Undo Toast */}
            <AnimatePresence>
                {
                    deletedIdeas.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-24 left-6 right-6 md:bottom-10 md:left-auto md:right-10 md:w-auto bg-pink-50 dark:bg-pink-900 text-pink-900 dark:text-pink-50 px-6 py-3 rounded-xl shadow-2xl shadow-pink-100 dark:shadow-pink-900/20 border border-pink-100 dark:border-pink-800 flex items-center justify-between md:justify-start gap-4 z-50"
                        >
                            <span className="text-sm font-medium">
                                {t('inspiration.ideaDeleted')}
                                {deletedIdeas.length > 1 && <span className="ml-1 opacity-70">({deletedIdeas.length})</span>}
                            </span>
                            <button
                                onClick={handleUndo}
                                className="text-sm font-bold text-pink-500 dark:text-pink-300 hover:text-pink-400 dark:hover:text-pink-200 transition-colors flex items-center gap-2"
                            >
                                <span>{t('common.undo')}</span>
                                <kbd className="text-[10px] bg-pink-100 dark:bg-pink-800 px-1.5 py-0.5 rounded text-pink-600 dark:text-pink-200 font-mono border border-pink-200 dark:border-pink-700">⌘Z</kbd>
                            </button>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            <AiTodoImportModal
                isOpen={isAiImportOpen}
                mode={aiImportMode}
                onModeChange={handleAiImportModeChange}
                onClose={() => setIsAiImportOpen(false)}
                pendingTodoCount={pendingTodoIdeas.length}
                unclassifiedTodoCount={unclassifiedTodoIdeas.length}
                isPromptCopied={isPromptCopied}
                isTodoCopied={isTodoCopied}
                isClassifyPromptCopied={isClassifyPromptCopied}
                onCopyPrompt={handleCopyPrompt}
                onCopyPendingTodos={handleCopyPendingTodos}
                onCopyClassifyPrompt={handleCopyClassifyPrompt}
                aiImportText={aiImportText}
                onAiImportTextChange={handleAiImportTextChange}
                aiImportError={aiImportError}
                aiImportSuccessCount={aiImportSuccessCount}
                onBatchImport={handleBatchImportFromAi}
                aiClassifyText={aiClassifyText}
                onAiClassifyTextChange={handleAiClassifyTextChange}
                aiClassifyError={aiClassifyError}
                aiClassifySuccessCount={aiClassifySuccessCount}
                onApplyClassification={handleApplyAiClassification}
            />

            {/* AI Category Transfer Modal */}
            <AnimatePresence>
                {isCategoryTransferOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[125] flex items-center justify-center p-4 md:p-6 bg-white/45 dark:bg-black/45 backdrop-blur-xl"
                        onClick={() => setIsCategoryTransferOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 18 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 18 }}
                            transition={{ duration: 0.24 }}
                            className="w-full max-w-[860px] bg-white/95 dark:bg-gray-900/95 border border-white/60 dark:border-gray-800 rounded-[2rem] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.25)] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="px-6 py-5 border-b border-sky-100/70 dark:border-sky-900/30 bg-gradient-to-r from-sky-50/90 via-cyan-50/70 to-sky-50/90 dark:from-sky-900/30 dark:via-cyan-900/20 dark:to-sky-900/30">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="inline-flex items-center gap-2 text-sky-500 dark:text-sky-300 mb-2">
                                            <Sparkles size={16} />
                                            <span className="text-xs font-semibold tracking-wide uppercase">AI Category Transfer</span>
                                        </div>
                                        <h3 className="text-[30px] leading-tight font-light text-gray-900 dark:text-white tracking-tight">AI 一键分类迁移</h3>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-light">
                                            先导出一个分类的内容给 AI 分类，再把结果粘贴回来自动迁移到目标分类。
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsCategoryTransferOpen(false)}
                                        className="p-2 rounded-full hover:bg-white/70 dark:hover:bg-gray-800 text-gray-400 hover:text-sky-500 dark:hover:text-sky-300 transition-colors"
                                        title={t('common.close', '关闭')}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 items-end">
                                    <label className="block">
                                        <span className="block text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-2">
                                            导出源分类
                                        </span>
                                        <select
                                            value={categoryTransferSourceId}
                                            onChange={(e) => {
                                                setCategoryTransferSourceId(e.target.value);
                                                setCategoryTransferError('');
                                                setCategoryTransferSuccessCount(0);
                                            }}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-sky-300/50 dark:focus:ring-sky-700/50 focus:border-sky-300 dark:focus:border-sky-700 transition-all"
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            onClick={handleCopyCategoryTransferPrompt}
                                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-400 text-white hover:bg-sky-500 transition-colors text-sm font-medium shadow-lg shadow-sky-100 dark:shadow-sky-900/30"
                                        >
                                            <Copy size={14} />
                                            {isCategoryPromptCopied ? '分类指令已复制' : '复制完整分类指令'}
                                        </button>
                                        <button
                                            onClick={handleCopyCategoryTransferContent}
                                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-sky-500 dark:text-sky-300 border border-sky-100 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors text-sm font-medium"
                                        >
                                            <ListChecks size={14} />
                                            {isCategoryContentCopied
                                                ? '分类内容已复制'
                                                : `复制分类内容（${categoryTransferIdeas.length}）`}
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-4">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={isCategoryTransferTargetOnly}
                                                onChange={(e) => {
                                                    setIsCategoryTransferTargetOnly(e.target.checked);
                                                    setCategoryTransferError('');
                                                    setCategoryTransferSuccessCount(0);
                                                }}
                                                className="h-4 w-4 rounded border-gray-300 text-sky-500 focus:ring-sky-400"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                                                仅迁移到指定分类（忽略其他分类）
                                            </span>
                                        </label>

                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">目标分类</span>
                                            <select
                                                value={categoryTransferTargetId}
                                                onChange={(e) => {
                                                    setCategoryTransferTargetId(e.target.value);
                                                    setCategoryTransferError('');
                                                    setCategoryTransferSuccessCount(0);
                                                }}
                                                disabled={!isCategoryTransferTargetOnly}
                                                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-sky-300/50 dark:focus:ring-sky-700/50 focus:border-sky-300 dark:focus:border-sky-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        打开后可直接粘贴全量 AI 结果，只会迁移命中目标分类的条目（例如只迁移“开发”）。
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-sky-100 dark:border-sky-800/40 bg-sky-50/60 dark:bg-sky-900/15 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-[11px] font-semibold tracking-wide uppercase text-sky-500 dark:text-sky-300">
                                            {categoryTransferSourceCategory?.label || '当前分类'} 内容预览
                                        </div>
                                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                            {categoryTransferIdeas.length} 项
                                        </span>
                                    </div>
                                    {categoryTransferIdeas.length === 0 && (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            当前分类没有可导出的内容。
                                        </p>
                                    )}
                                    {categoryTransferIdeas.length > 0 && (
                                        <pre className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono max-h-36 overflow-y-auto">
                                            {categoryTransferNumberedText}
                                        </pre>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-2">
                                        粘贴 AI 分类输出（格式：编号. 分类名）
                                    </label>
                                    <textarea
                                        value={categoryTransferText}
                                        onChange={(e) => {
                                            setCategoryTransferText(e.target.value);
                                            if (categoryTransferError) setCategoryTransferError('');
                                        }}
                                        placeholder={'示例：\n1. 代办\n2. 情绪\n3. 随记'}
                                        className="w-full min-h-[220px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 p-4 outline-none focus:ring-2 focus:ring-sky-300/50 dark:focus:ring-sky-700/50 focus:border-sky-300 dark:focus:border-sky-700 transition-all"
                                    />
                                </div>

                                {categoryTransferError && (
                                    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl px-3 py-2">
                                        {categoryTransferError}
                                    </div>
                                )}

                                {categoryTransferSuccessCount > 0 && (
                                    <div className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl px-3 py-2">
                                        已成功迁移 {categoryTransferSuccessCount} 条内容。
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                        onClick={() => setIsCategoryTransferOpen(false)}
                                        className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        关闭
                                    </button>
                                    <button
                                        onClick={handleApplyCategoryTransfer}
                                        disabled={!categoryTransferText.trim() || categoryTransferIdeas.length === 0}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-400 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-sky-100 dark:shadow-sky-900/30"
                                    >
                                        <ArrowRight size={14} />
                                        {isCategoryTransferTargetOnly
                                            ? `仅迁移到 ${categoryTransferTargetCategory?.label || '目标分类'}`
                                            : '导入并迁移'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Week Selector Modal */}
            < AnimatePresence >
                {showWeekSelector && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/40 dark:bg-black/40 backdrop-blur-xl"
                        onClick={() => setShowWeekSelector(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-gray-800 overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-light text-gray-900 dark:text-white mb-1">选择周区间</h3>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-light">快速跳转到历史灵感</p>
                                    </div>
                                    <button
                                        onClick={() => setShowWeekSelector(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors group"
                                    >
                                        <X size={20} className="text-gray-400 group-hover:text-pink-500 transition-colors" />
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {groupedWeeks.map((yearGroup) => (
                                        <div key={yearGroup.year} className="space-y-4">
                                            {groupedWeeks.length > 1 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-pink-400 bg-pink-50 dark:bg-pink-900/30 px-2 py-0.5 rounded uppercase tracking-tighter">
                                                        {yearGroup.year}
                                                    </span>
                                                    <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                                                </div>
                                            )}

                                            {yearGroup.months.map((monthGroup) => {
                                                const SOLAR_TERMS = [
                                                    ['小寒', '大寒'], ['立春', '雨水'], ['惊蛰', '春分'],
                                                    ['清明', '谷雨'], ['立夏', '小满'], ['芒种', '夏至'],
                                                    ['小暑', '大暑'], ['立秋', '处暑'], ['白露', '秋分'],
                                                    ['寒露', '霜降'], ['立冬', '小雪'], ['大雪', '冬至']
                                                ];
                                                const terms = SOLAR_TERMS[parseInt(monthGroup.month) - 1] || [];

                                                return (
                                                    <div key={monthGroup.month} className="space-y-2">
                                                        <div className="flex items-center justify-between px-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                                    {monthGroup.month}月
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-light mt-0.5">
                                                                    · {terms.join(' ')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            {monthGroup.weeks.map((week) => (
                                                                <button
                                                                    key={week.key}
                                                                    onClick={() => scrollToWeek(week.key)}
                                                                    className="text-center p-3 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 hover:bg-pink-50 dark:hover:bg-pink-900/40 group transition-all duration-300 border border-transparent hover:border-pink-100 dark:hover:border-pink-800/50 flex flex-col justify-center min-h-[50px]"
                                                                >
                                                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-pink-600 dark:group-hover:text-pink-300">
                                                                        {week.start.getDate()} - {week.end.getDate()}日
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}

                                    {groupedWeeks.length === 0 && (
                                        <div className="py-12 text-center">
                                            <Calendar className="mx-auto text-gray-200 dark:text-gray-800 mb-2" size={32} />
                                            <p className="text-gray-400 font-light text-sm italic">暂无历史灵感回顾</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* Batch Action Bar */}
            < AnimatePresence >
                {isSelectionMode && selectedIdeaIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-0 left-0 right-0 md:bottom-10 md:left-1/2 md:-translate-x-1/2 z-[110] md:w-auto"
                    >
                        <div className="bg-white/90 dark:bg-gray-950/90 md:bg-white/80 md:dark:bg-gray-950/80 backdrop-blur-2xl border-t md:border border-gray-100 dark:border-gray-800 md:rounded-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.2)] md:shadow-2xl px-4 py-3 md:p-3 pb-[max(12px,env(safe-area-inset-bottom))] md:pb-3 flex items-center justify-between md:justify-start gap-4 md:gap-3 w-full md:w-auto transition-all duration-300">

                            {/* 已选项 */}
                            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{selectedIdeaIds.length} 项</span>
                            </div>

                            <button
                                onClick={handleCopySelectedIdeas}
                                className="px-3 py-2 bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-900/50 text-pink-600 dark:text-pink-300 rounded-xl text-xs font-medium transition-colors active:scale-95 flex-shrink-0"
                            >
                                {isBatchCopied ? '已复制选中' : '复制选中'}
                            </button>

                            <button
                                onClick={handleBatchDelete}
                                className="px-3 py-2 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 rounded-xl text-xs font-medium transition-colors active:scale-95 flex-shrink-0 inline-flex items-center gap-1.5"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                删除选中
                            </button>

                            <div className="grid grid-cols-4 gap-2 flex-1 min-w-0 md:flex md:items-center md:gap-2 md:overflow-x-auto md:no-scrollbar md:justify-start">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleBatchMove(cat.id)}
                                        className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-300 flex items-center justify-center md:justify-start gap-1.5 border min-w-0 w-full md:w-auto md:flex-shrink-0 ${cat.textColor} ${cat.color.replace('bg-', 'bg-opacity-10 dark:bg-opacity-20 ')} border-transparent hover:border-current shadow-sm active:scale-95`}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${cat.dotColor}`} />
                                        <span className="truncate max-w-full whitespace-nowrap">{cat.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* 取消按钮 - 固定在右侧 */}
                            <button
                                onClick={() => {
                                    setIsSelectionMode(false);
                                    setSelectedIdeaIds([]);
                                }}
                                className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-medium transition-colors active:scale-95 flex-shrink-0"
                            >
                                取消
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >

            <CategoryManager
                isOpen={isCategoryManagerOpen}
                onClose={() => setCategoryManagerOpen(false)}
                categories={categories}
                onAdd={addCategory}
                onUpdate={updateCategory}
                onRemove={removeCategory}
                onOpenAiCategoryTransfer={handleOpenCategoryTransfer}
            />
        </div >
    );
};

export default InspirationModule;
