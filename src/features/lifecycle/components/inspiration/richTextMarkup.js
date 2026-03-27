import { COLOR_CONFIG } from './InspirationUtils';
import { buildCodeBlockTheme, trimCodeBlockFenceContent } from './codeBlockTheme';

const BLOCK_TAGS = new Set(['DIV', 'P', 'LI']);
const MARKUP_TOKEN_REGEX = /(```[\s\S]*?```|#![^:]+:[^#]+#|\*\*[^*]+\*\*)/g;

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

const appendBlockMarkup = (result, blockMarkup, hasNextSibling) => {
    let nextResult = result;

    if (nextResult && !nextResult.endsWith('\n')) {
        nextResult += '\n';
    }

    nextResult += blockMarkup;

    if (hasNextSibling && blockMarkup && !nextResult.endsWith('\n')) {
        nextResult += '\n';
    }

    return nextResult;
};

const styleObjectToCssText = (styleObject = {}) => Object.entries(styleObject)
    .map(([property, value]) => {
        const cssProperty = property.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
        return `${cssProperty}:${value}`;
    })
    .join(';');

const tokenizeMarkup = (text) => {
    const tokens = [];
    let lastIndex = 0;
    let match = null;

    MARKUP_TOKEN_REGEX.lastIndex = 0;

    while ((match = MARKUP_TOKEN_REGEX.exec(text)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        const token = match[0];
        if (token.startsWith('```')) {
            tokens.push({ type: 'code-block', value: token });
        } else if (token.startsWith('#!')) {
            tokens.push({ type: 'highlight', value: token });
        } else {
            tokens.push({ type: 'bold', value: token });
        }

        lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
        tokens.push({ type: 'text', value: text.slice(lastIndex) });
    }

    return tokens;
};

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

        const hasNextSibling = index < node.childNodes.length - 1;

        if (childNode.classList?.contains('code-block-card')) {
            const codeBlockText = serializeRichTextChildren(childNode)
                .replace(/#![^:]+:([^#]+)#/g, '$1')
                .replace(/\*\*([^*]+)\*\*/g, '$1');
            const codeBlockMarkup = `\`\`\`\n${trimCodeBlockFenceContent(codeBlockText)}\n\`\`\``;
            result = appendBlockMarkup(result, codeBlockMarkup, hasNextSibling);
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
            result = appendBlockMarkup(result, blockMarkup, hasNextSibling);
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
    if (markup.includes('```')) return markup;
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

export const markupToHtml = (text, options = {}) => {
    if (!text) return '';

    const codeBlockTheme = buildCodeBlockTheme(options.accentHex);

    return tokenizeMarkup(text)
        .map((token) => {
            if (token.type === 'code-block') {
                const content = trimCodeBlockFenceContent(token.value);
                return `<div class="code-block-card" style="${styleObjectToCssText(codeBlockTheme.editorBlockStyle)}">${escapeHtml(content).replace(/\n/g, '<br>')}</div>`;
            }

            if (token.type === 'highlight') {
                const colorMatch = token.value.match(/^#!([^:]+):([^#]+)#$/);
                if (!colorMatch) {
                    return escapeHtml(token.value);
                }

                const [, colorId, content] = colorMatch;
                const colorConfig = COLOR_CONFIG.find((item) => item.id === colorId);
                const highlightColor = colorConfig?.highlight || 'rgba(167, 139, 250, 0.5)';
                const style = `background: radial-gradient(ellipse 100% 40% at center 80%, ${highlightColor} 0%, ${highlightColor} 70%, transparent 100%); padding: 0 0.15em;`;
                return `<span class="colored-text relative inline" data-color-id="${colorId}" style="${style}">${escapeHtml(content)}</span>`;
            }

            if (token.type === 'bold') {
                const boldMatch = token.value.match(/^\*\*([^*]+)\*\*$/);
                if (!boldMatch) {
                    return escapeHtml(token.value);
                }

                return `<strong class="rich-inline-bold">${escapeHtml(boldMatch[1])}</strong>`;
            }

            return escapeHtml(token.value).replace(/\n/g, '<br>');
        })
        .join('');
};
