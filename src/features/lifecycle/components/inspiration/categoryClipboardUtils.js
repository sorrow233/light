import { normalizeIdeaTextForExport } from './categoryTransferUtils';

const padTimePart = (value) => String(value).padStart(2, '0');

export const formatIdeaTimestampForClipboard = (rawTimestamp) => {
    const timestamp = Number(rawTimestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
        return '时间未知';
    }

    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return '时间未知';
    }

    return `${date.getFullYear()}-${padTimePart(date.getMonth() + 1)}-${padTimePart(date.getDate())} ${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
};

export const buildCategoryClipboardText = ({ categoryLabel, ideas = [] }) => {
    const safeCategoryLabel = categoryLabel || '当前分类';
    const lines = ideas.map((idea, index) => {
        const statusLabel = idea?.completed ? '已完成' : '未完成';
        const timestampLabel = formatIdeaTimestampForClipboard(idea?.timestamp);
        const content = normalizeIdeaTextForExport(idea?.content || '');

        return `${index + 1}. [${statusLabel}] [${timestampLabel}] ${content || '（空）'}`;
    });

    return [
        `分类：${safeCategoryLabel}`,
        `数量：${ideas.length}`,
        '',
        ...(lines.length > 0 ? lines : ['暂无内容']),
    ].join('\n');
};
