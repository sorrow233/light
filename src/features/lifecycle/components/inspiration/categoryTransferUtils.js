const DEFAULT_CATEGORY_ALIASES = {
    note: ['随记', '笔记', 'note', 'notes'],
    todo: ['代办', '待办', 'todo', 'todos', 'task', 'tasks'],
    emotion: ['情绪', '心情', 'emotion', 'mood'],
};

const normalizeMatchToken = (value = '') => {
    return String(value)
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[“”"'`·,，。!！?？;；:：()（）\[\]{}<>《》【】\-_/\\|]/g, '');
};

export const normalizeIdeaTextForExport = (content = '') => {
    return String(content)
        .replace(/#![^:]+:([^#]+)#/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\[([^\]]+)\]/g, '$1')
        .replace(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?/gi, '')
        .replace(/https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s]+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
};

export const buildCategoryExportText = (ideas = []) => {
    return ideas
        .map((idea, index) => {
            const normalized = normalizeIdeaTextForExport(idea?.content || '');
            return `${index + 1}. ${normalized || '（空）'}`;
        })
        .join('\n');
};

const buildCategoryAliasIndex = (categories = []) => {
    const aliasToId = new Map();

    categories.forEach((category) => {
        const categoryId = category?.id;
        if (!categoryId) return;

        const aliases = new Set([
            category?.label,
            categoryId,
            ...(DEFAULT_CATEGORY_ALIASES[categoryId] || []),
        ]);

        aliases.forEach((alias) => {
            const normalizedAlias = normalizeMatchToken(alias);
            if (!normalizedAlias) return;
            if (!aliasToId.has(normalizedAlias)) {
                aliasToId.set(normalizedAlias, categoryId);
            }
        });
    });

    return aliasToId;
};

const resolveCategoryIdFromText = (rawTarget, aliasToId) => {
    const normalizedTarget = normalizeMatchToken(rawTarget);
    if (!normalizedTarget) return null;

    if (aliasToId.has(normalizedTarget)) {
        return aliasToId.get(normalizedTarget);
    }

    let bestMatch = null;
    let bestScore = 0;

    aliasToId.forEach((categoryId, alias) => {
        if (!alias) return;
        if (normalizedTarget.includes(alias) || alias.includes(normalizedTarget)) {
            const score = alias.length;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = categoryId;
            }
        }
    });

    return bestMatch;
};

export const buildCategoryTransferPrompt = ({ sourceCategoryLabel, categories, numberedIdeasText }) => {
    const categoryLines = categories
        .map((category, index) => `${index + 1}. ${category.label}`)
        .join('\n');

    return `你是灵感分类助手。请根据每条内容的语义，判断它应该归入哪个分类。\n\n源分类：${sourceCategoryLabel}\n\n可选分类（必须严格使用以下分类名称）：\n${categoryLines}\n\n规则：\n1. 不要改写内容，不要新增内容，不要删除内容。\n2. 每行仅输出“编号. 分类名称”，例如：1. 代办\n3. 编号必须与输入列表中的编号一致。\n4. 分类名称必须严格来自“可选分类”。\n5. 不要输出解释、标题、代码块或额外文本。\n\n待分类内容：\n${numberedIdeasText || '暂无内容'}`;
};

export const parseCategoryTransferOutput = ({ rawText, categories, maxIndex }) => {
    if (!rawText || !rawText.trim() || !Array.isArray(categories) || categories.length === 0 || maxIndex <= 0) {
        return [];
    }

    const aliasToId = buildCategoryAliasIndex(categories);
    const cleanedText = rawText
        .replace(/\r\n?/g, '\n')
        .replace(/```[\w-]*\n?/g, '')
        .replace(/```/g, '')
        .trim();

    if (!cleanedText) return [];

    const lines = cleanedText
        .split('\n')
        .map((line) => line.replace(/^>\s?/, '').trim())
        .filter(Boolean);

    const assignments = new Map();
    let sequentialIndex = 0;

    lines.forEach((line) => {
        let targetIndex = sequentialIndex;
        let targetText = line;

        const numberedMatch = line.match(/^\s*[（(]?(\d+)[）)]?\s*(?:[.)、:：\-]|->|=>)\s*(.+)$/);
        if (numberedMatch) {
            targetIndex = Number(numberedMatch[1]) - 1;
            targetText = numberedMatch[2].trim();
            sequentialIndex = Math.max(sequentialIndex, targetIndex + 1);
        } else {
            const inlineMatch = line.match(/^\s*(?:编号\s*)?(\d+)\s*(?:->|=>|是|为)\s*(.+)$/);
            if (inlineMatch) {
                targetIndex = Number(inlineMatch[1]) - 1;
                targetText = inlineMatch[2].trim();
                sequentialIndex = Math.max(sequentialIndex, targetIndex + 1);
            } else {
                sequentialIndex += 1;
            }
        }

        if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= maxIndex) return;

        targetText = targetText
            .replace(/^分类\s*[:：]\s*/i, '')
            .replace(/^目标分类\s*[:：]\s*/i, '')
            .replace(/^[“"'「]/, '')
            .replace(/[”"'」]$/, '')
            .trim();

        const categoryId = resolveCategoryIdFromText(targetText, aliasToId);
        if (!categoryId) return;

        assignments.set(targetIndex, categoryId);
    });

    return Array.from(assignments.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([index, categoryId]) => ({ index, categoryId }));
};
