import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { COLOR_CONFIG } from './InspirationUtils';
import { htmlToMarkup, markupToHtml, mergeMarkupWithPlainTextLineBreaks } from './richTextMarkup';
import { buildCodeBlockTheme } from './codeBlockTheme';

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
    accentHex,
}, ref) => {
    const editorRef = useRef(null);
    const isComposing = useRef(false);
    const lastSelectionRef = useRef(null);
    const codeBlockTheme = buildCodeBlockTheme(accentHex);

    const applyCodeBlockThemeToEditor = useCallback(() => {
        if (!editorRef.current) return;

        editorRef.current.querySelectorAll('.code-block-card').forEach((node) => {
            Object.assign(node.style, codeBlockTheme.editorBlockStyle);
        });
    }, [codeBlockTheme.editorBlockStyle]);

    const focusSelectionAfterNode = useCallback((node) => {
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();
        if (node?.parentNode) {
            range.setStartAfter(node);
        } else if (editorRef.current) {
            range.selectNodeContents(editorRef.current);
        }
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
        lastSelectionRef.current = range.cloneRange();
    }, []);

    const captureSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

        lastSelectionRef.current = range.cloneRange();
    }, []);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        focus: () => editorRef.current?.focus(),
        // 获取当前选择范围
        getSelection: () => {
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
                return sel.getRangeAt(0);
            }
            return lastSelectionRef.current;
        },
        // 应用颜色到选中文本
        applyColor: (colorId) => {
            const sel = window.getSelection();
            let range = null;

            if (sel?.rangeCount) {
                const liveRange = sel.getRangeAt(0);
                if (editorRef.current?.contains(liveRange.commonAncestorContainer)) {
                    range = liveRange;
                }
            }

            if (!range && lastSelectionRef.current) {
                range = lastSelectionRef.current.cloneRange();
                if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }

            if (!range || range.isCollapsed) return false;
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

            // 使用 extractContents 比 surroundContents 更稳，跨节点选区也能包裹
            try {
                const fragment = range.extractContents();
                if (!fragment.textContent?.trim()) return false;

                coloredSpan.appendChild(fragment);
                range.insertNode(coloredSpan);
                sel.removeAllRanges();

                // 将光标移到颜色文字后面
                const newRange = document.createRange();
                newRange.setStartAfter(coloredSpan);
                newRange.collapse(true);
                sel.addRange(newRange);
                lastSelectionRef.current = newRange.cloneRange();

                // 触发内容改变
                handleInput();
                return true;
            } catch (e) {
                console.warn('Color apply failed:', e);
                return false;
            }
        },
        applyCodeBlock: () => {
            const sel = window.getSelection();
            let range = null;

            if (sel?.rangeCount) {
                const liveRange = sel.getRangeAt(0);
                if (editorRef.current?.contains(liveRange.commonAncestorContainer)) {
                    range = liveRange;
                }
            }

            if (!range && lastSelectionRef.current) {
                range = lastSelectionRef.current.cloneRange();
                if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }

            if (!range || !editorRef.current?.contains(range.commonAncestorContainer)) return false;

            let parentCodeBlock = null;
            let node = range.commonAncestorContainer;
            while (node && node !== editorRef.current) {
                if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('code-block-card')) {
                    parentCodeBlock = node;
                    break;
                }
                node = node.parentNode;
            }

            if (parentCodeBlock) {
                return unwrapCodeBlock(parentCodeBlock);
            }

            if (range.isCollapsed) return false;

            const codeBlock = document.createElement('div');
            codeBlock.className = 'code-block-card';
            Object.assign(codeBlock.style, codeBlockTheme.editorBlockStyle);

            try {
                const fragment = range.extractContents();
                if (!fragment.textContent?.trim()) return false;

                codeBlock.appendChild(fragment);
                range.insertNode(codeBlock);
                focusSelectionAfterNode(codeBlock);
                handleInput();
                return true;
            } catch (e) {
                console.warn('Code block apply failed:', e);
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

    // 处理输入事件
    const handleInput = useCallback(() => {
        if (!editorRef.current) return;
        const markup = htmlToMarkup(editorRef.current);
        onChange?.(markup);
    }, [htmlToMarkup, onChange]);

    const unwrapCodeBlock = useCallback((codeBlockNode) => {
        if (!codeBlockNode?.parentNode) return false;

        const fragment = document.createDocumentFragment();
        const childNodes = Array.from(codeBlockNode.childNodes);
        childNodes.forEach((node) => fragment.appendChild(node));

        const lastChild = childNodes[childNodes.length - 1] || null;
        codeBlockNode.parentNode.replaceChild(fragment, codeBlockNode);
        focusSelectionAfterNode(lastChild);
        handleInput();
        return true;
    }, [focusSelectionAfterNode, handleInput]);

    // 同步外部 value 到编辑器
    useEffect(() => {
        if (!editorRef.current) return;

        // 比较当前内容与新值
        const currentMarkup = htmlToMarkup(editorRef.current);
        const nextMarkup = value || '';
        if (currentMarkup !== nextMarkup) {
            editorRef.current.innerHTML = markupToHtml(nextMarkup, { accentHex });
            return;
        }

        // 仅在分类颜色变化时刷新代码块样式，避免输入过程中重建 DOM 打断光标。
        applyCodeBlockThemeToEditor();
    }, [accentHex, applyCodeBlockThemeToEditor, value]);

    useEffect(() => {
        const handleSelectionChange = () => {
            captureSelection();
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [captureSelection]);

    // 处理粘贴 - 将纯文本中的标记转换为 HTML 效果
    const handlePaste = useCallback((e) => {
        e.preventDefault();

        const html = e.clipboardData.getData('text/html');
        if (html) {
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = html;
            const markup = htmlToMarkup(tempContainer);
            const plainText = e.clipboardData.getData('text/plain');
            const mergedMarkup = mergeMarkupWithPlainTextLineBreaks(markup, plainText);
            document.execCommand('insertHTML', false, markupToHtml(mergedMarkup, { accentHex }));
            requestAnimationFrame(handleInput);
            return;
        }

        const text = e.clipboardData.getData('text/plain');
        // 如果包含标记，则通过 markupToHtml 转换并插入 HTML
        if (text.includes('#!') || text.includes('**') || text.includes('\n')) {
            document.execCommand('insertHTML', false, markupToHtml(text, { accentHex }));
            requestAnimationFrame(handleInput);
        } else {
            document.execCommand('insertText', false, text);
        }
    }, [accentHex, handleInput]);

    // 处理按键
    const handleKeyDownInternal = useCallback((e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
            e.preventDefault();
            document.execCommand('bold', false);
            handleInput();
            return;
        }

        onKeyDown?.(e);
    }, [handleInput, onKeyDown]);

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
            onMouseUp={captureSelection}
            onKeyUp={captureSelection}
            onFocus={captureSelection}
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
