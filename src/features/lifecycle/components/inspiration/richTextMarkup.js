import { COLOR_CONFIG } from './InspirationUtils';

const BLOCK_TAGS = new Set(['DIV', 'P', 'LI']);

const isBoldFontWeight = (fontWeight) => {
    if (!fontWeight) return false;
    if (fontWeight === 'bold' || fontWeight === 'bolder') return true;

    const numericWeight = Number(fontWeight);
    return Number.isFinite(numericWeight) && numericWeight >= 600;
};

const escapeHtml = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const normalizeClipboardText = (text) => String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ');

const serializeRichTextChildren = (node) => {
    let result = '';

    node.childNodes.forEach((childNode, index) => {
        if (childNode.nodeType === Node.TEXT_NODE) {
            result += normalizeClipboardText(childNode.textContent);
            return;
        }

        if (childNode.nodeType !== Node.ELEMENT_NODE) {
            return;
        }

        const tagName = childNode.tagName;
        if (tagName === 'BR') {
            result += '\n';
            return;
        }

        if (childNode.classList?.contains('colored-text')) {
            const colorId = childNode.dataset.colorId;
            const innerMarkup = serializeRichTextChildren(childNode);
            result += `#!${colorId}:${innerMarkup}#`;
            return;
        }

        if (tagName === 'STRONG' || tagName === 'B' || isBoldFontWeight(childNode.style?.fontWeight)) {
            result += `**${serializeRichTextChildren(childNode)}**`;
            return;
        }

        if (BLOCK_TAGS.has(tagName)) {
            const blockMarkup = serializeRichTextChildren(childNode);
            if (result && !result.endsWith('\n')) {
                result += '\n';
            }
            result += blockMarkup;

            const hasNextSibling = index < node.childNodes.length - 1;
            if (hasNextSibling && blockMarkup && !result.endsWith('\n')) {
                result += '\n';
            }
            return;
        }

        result += serializeRichTextChildren(childNode);
    });

    return result;
};

export const htmlToMarkup = (element) => {
    if (!element) return '';
    return serializeRichTextChildren(element);
};

const countLineBreaks = (text) => (text.match(/\n/g) || []).length;

const extractPlainTextWithBoldRanges = (markup) => {
    let plainText = '';
    const boldRanges = [];

    for (let index = 0; index < markup.length;) {
        if (markup.startsWith('**', index)) {
            const endIndex = markup.indexOf('**', index + 2);
            if (endIndex !== -1) {
                const boldText = markup.slice(index + 2, endIndex);
                const start = plainText.replace(/\n/g, '').length;
                plainText += boldText;
                const end = plainText.replace(/\n/g, '').length;
                boldRanges.push({ start, end });
                index = endIndex + 2;
                continue;
            }
        }

        if (markup.startsWith('#!', index)) {
            const colorMatch = markup.slice(index).match(/^#!([^:]+):([^#]+)#/);
            if (colorMatch) {
                plainText += colorMatch[2];
                index += colorMatch[0].length;
                continue;
            }
        }

        plainText += markup[index];
        index += 1;
    }

    return { plainText, boldRanges };
};

export const mergeMarkupWithPlainTextLineBreaks = (markup, plainText) => {
    const normalizedPlainText = normalizeClipboardText(plainText);
    if (!normalizedPlainText || !markup) return markup;
    if (!markup.includes('**') && !markup.includes('#!')) return normalizedPlainText;
    if (countLineBreaks(normalizedPlainText) <= countLineBreaks(markup)) return markup;

    const { plainText: markupPlainText, boldRanges } = extractPlainTextWithBoldRanges(markup);
    const collapsedMarkupText = normalizeClipboardText(markupPlainText).replace(/\n/g, '');
    const collapsedPlainText = normalizedPlainText.replace(/\n/g, '');

    if (!collapsedMarkupText || collapsedMarkupText !== collapsedPlainText) {
        return markup;
    }

    const openPositions = new Set(boldRanges.map((range) => range.start));
    const closePositions = new Set(boldRanges.map((range) => range.end));

    let result = '';
    let collapsedIndex = 0;
    for (const char of normalizedPlainText) {
        if (char !== '\n') {
            if (openPositions.has(collapsedIndex)) {
                result += '**';
            }

            result += char;
            collapsedIndex += 1;

            if (closePositions.has(collapsedIndex)) {
                result += '**';
            }
            continue;
        }

        result += char;
    }

    if (closePositions.has(collapsedIndex) && !result.endsWith('**')) {
        result += '**';
    }

    return result;
};

export const markupToHtml = (text) => {
    if (!text) return '';

    return escapeHtml(text)
        .replace(/#!([^:]+):([^#]+)#/g, (match, colorId, content) => {
            const colorConfig = COLOR_CONFIG.find((item) => item.id === colorId);
            const highlightColor = colorConfig?.highlight || 'rgba(167, 139, 250, 0.5)';
            const style = `background: radial-gradient(ellipse 100% 40% at center 80%, ${highlightColor} 0%, ${highlightColor} 70%, transparent 100%); padding: 0 0.15em;`;
            return `<span class="colored-text relative inline" data-color-id="${colorId}" style="${style}">${content}</span>`;
        })
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
};
