import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { COLOR_CONFIG } from './InspirationUtils';

/**
 * 富文本输入框组件 - 使用 contenteditable 实现真正的富文本编辑
 * 解决 textarea + 预览层方案的光标对齐问题
 */
const RichTextInput = forwardRef(({
    value,
    onChange,
    onKeyDown,
    onBlur,
    placeholder,
    className,
    style,
}, ref) => {
    const editorRef = useRef(null);
    const isComposing = useRef(false);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        focus: () => editorRef.current?.focus(),
        // 获取当前选择范围
        getSelection: () => {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
                return sel.getRangeAt(0);
            }
            return null;
        },
        // 应用颜色到选中文本
        applyColor: (colorId) => {
            const sel = window.getSelection();
            if (!sel.rangeCount || sel.isCollapsed) return false;

            const range = sel.getRangeAt(0);
            if (!editorRef.current?.contains(range.commonAncestorContainer)) return false;

            const colorConfig = COLOR_CONFIG.find(c => c.id === colorId);
            if (!colorConfig) return false;

            // 检查选中内容是否在已有颜色 span 内
            let parentColorSpan = null;
            let node = range.commonAncestorContainer;
            while (node && node !== editorRef.current) {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('colored-text')) {
                    parentColorSpan = node;
                    break;
                }
                node = node.parentNode;
            }

            // 如果选中的内容在颜色 span 内，更新颜色而不是嵌套
            if (parentColorSpan) {
                const highlightColor = colorConfig.highlight || 'rgba(167, 139, 250, 0.5)';
                parentColorSpan.style.color = 'inherit'; // Let theme decide or keep it neutral
                parentColorSpan.style.background = `radial-gradient(ellipse 100% 40% at center 80%, ${highlightColor} 0%, ${highlightColor} 70%, transparent 100%)`;
                parentColorSpan.dataset.colorId = colorId;
                handleInput();
                return true;
            }

            // 创建带颜色的 span
            const coloredSpan = document.createElement('span');
            const highlightColor = colorConfig.highlight || 'rgba(167, 139, 250, 0.5)';
            coloredSpan.style.background = `radial-gradient(ellipse 100% 40% at center 80%, ${highlightColor} 0%, ${highlightColor} 70%, transparent 100%)`;
            coloredSpan.style.padding = '0 0.15em';
            coloredSpan.dataset.colorId = colorId;
            coloredSpan.className = 'colored-text relative inline';

            // 包裹选中内容
            try {
                range.surroundContents(coloredSpan);
                sel.removeAllRanges();

                // 将光标移到颜色文字后面
                const newRange = document.createRange();
                newRange.setStartAfter(coloredSpan);
                newRange.collapse(true);
                sel.addRange(newRange);

                // 触发内容改变
                handleInput();
                return true;
            } catch (e) {
                // surroundContents 在跨节点选择时可能失败
                console.warn('Color apply failed:', e);
                return false;
            }
        },
        // 清空内容
        clear: () => {
            if (editorRef.current) {
                editorRef.current.innerHTML = '';
                handleInput();
            }
        },
        // 获取内容元素
        getElement: () => editorRef.current,
    }));

    // 将 HTML 转换为带标记的纯文本 (用于存储)
    const htmlToMarkup = useCallback((element) => {
        if (!element) return '';

        let result = '';
        element.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'BR') {
                    result += '\n';
                } else if (node.classList?.contains('colored-text')) {
                    const colorId = node.dataset.colorId;
                    // 重要：提取纯文本内容，避免嵌套标记
                    const innerText = node.textContent;
                    result += `#!${colorId}:${innerText}#`;
                } else if (node.tagName === 'DIV') {
                    // DIV 通常表示新行
                    const inner = htmlToMarkup(node);
                    if (result && !result.endsWith('\n')) {
                        result += '\n';
                    }
                    result += inner;
                } else {
                    result += htmlToMarkup(node);
                }
            }
        });
        return result;
    }, []);

    // 将带标记的纯文本转换为 HTML
    const markupToHtml = useCallback((text) => {
        if (!text) return '';

        // 处理颜色标记
        let html = text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/#!([^:]+):([^#]+)#/g, (match, colorId, content) => {
                const colorConfig = COLOR_CONFIG.find(c => c.id === colorId);
                const highlightColor = colorConfig?.highlight || 'rgba(167, 139, 250, 0.5)';
                const style = `background: radial-gradient(ellipse 100% 40% at center 80%, ${highlightColor} 0%, ${highlightColor} 70%, transparent 100%); padding: 0 0.15em;`;
                return `<span class="colored-text relative inline" data-color-id="${colorId}" style="${style}">${content}</span>`;
            })
            .replace(/\n/g, '<br>');

        return html;
    }, []);

    // 处理输入事件
    const handleInput = useCallback(() => {
        if (!editorRef.current) return;
        const markup = htmlToMarkup(editorRef.current);
        onChange?.(markup);
    }, [htmlToMarkup, onChange]);

    // 同步外部 value 到编辑器
    useEffect(() => {
        if (!editorRef.current) return;

        // 获取当前光标位置
        const sel = window.getSelection();
        const currentPosition = sel.rangeCount > 0 ? {
            node: sel.anchorNode,
            offset: sel.anchorOffset
        } : null;

        // 比较当前内容与新值
        const currentMarkup = htmlToMarkup(editorRef.current);
        if (currentMarkup !== value) {
            editorRef.current.innerHTML = markupToHtml(value || '');
        }
    }, [value, htmlToMarkup, markupToHtml]);

    // 处理粘贴 - 将纯文本中的标记转换为 HTML 效果
    const handlePaste = useCallback((e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        // 如果包含标记，则通过 markupToHtml 转换并插入 HTML
        if (text.includes('#!') || text.includes('\n')) {
            const html = markupToHtml(text);
            document.execCommand('insertHTML', false, html);
        } else {
            document.execCommand('insertText', false, text);
        }
    }, [markupToHtml]);

    // 处理按键
    const handleKeyDownInternal = useCallback((e) => {
        onKeyDown?.(e);
    }, [onKeyDown]);

    // 处理输入法开始/结束
    const handleCompositionStart = () => { isComposing.current = true; };
    const handleCompositionEnd = () => {
        isComposing.current = false;
        handleInput();
    };

    return (
        <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className={className}
            style={style}
            onInput={handleInput}
            onKeyDown={handleKeyDownInternal}
            onPaste={handlePaste}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onBlur={onBlur}
            data-placeholder={placeholder}
            spellCheck="false"
            autoCorrect="off"
        />
    );
});

RichTextInput.displayName = 'RichTextInput';

export default RichTextInput;
