import { normalizeIdeaTextForExport } from './categoryTransferUtils';

const IDEA_IMAGE_URL_PATTERNS = [
    /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?)/gi,
    /(https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s]+)/gi,
];

const toTrimmedText = (value = '') => String(value || '').trim();

const collectIdeaImageUrls = (content = '') => {
    const safeContent = String(content || '');

    return [...new Set(
        IDEA_IMAGE_URL_PATTERNS.flatMap((pattern) => safeContent.match(pattern) || [])
    )];
};

const stripIdeaImageUrls = (content = '', imageUrls = []) => {
    let text = String(content || '');

    imageUrls.forEach((url) => {
        text = text.replace(url, '');
    });

    return text.trim();
};

export const buildIdeaClipboardText = ({ content = '', note = '' } = {}) => {
    const safeContent = toTrimmedText(content);
    const safeNote = toTrimmedText(note);

    if (safeContent && safeNote) {
        return `${safeContent}\n\n随记：${safeNote}`;
    }

    if (safeContent) {
        return safeContent;
    }

    if (safeNote) {
        return `随记：${safeNote}`;
    }

    return '';
};

export const buildIdeaCopyPayload = (idea = {}) => {
    const content = String(idea?.content || '');
    const note = toTrimmedText(idea?.note || '');
    const imageUrls = collectIdeaImageUrls(content);
    const contentWithoutImages = stripIdeaImageUrls(content, imageUrls);

    return {
        imageUrls,
        text: buildIdeaClipboardText({ content, note }),
        textWithoutImages: buildIdeaClipboardText({ content: contentWithoutImages, note }),
    };
};

export const buildNumberedIdeaClipboardText = (ideas = []) => {
    return ideas
        .map((idea, index) => {
            const content = normalizeIdeaTextForExport(idea?.content || '');
            const note = normalizeIdeaTextForExport(idea?.note || '');
            const mainLine = `${index + 1}. ${content || '（空）'}`;

            if (!note) {
                return mainLine;
            }

            return `${mainLine}\n   随记：${note}`;
        })
        .join('\n');
};
