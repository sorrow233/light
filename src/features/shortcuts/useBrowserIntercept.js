import { useEffect } from 'react';
import { BROWSER_INTERCEPTS } from './keymap.config';

/**
 * 检测是否为 Mac 系统
 */
const isMac = () => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

/**
 * 解析快捷键组合
 */
const parseKeyCombo = (combo) => {
    const parts = combo.toLowerCase().split('+');
    return {
        mod: parts.includes('mod'),
        ctrl: parts.includes('ctrl'),
        alt: parts.includes('alt'),
        shift: parts.includes('shift'),
        key: parts.find(p => !['mod', 'ctrl', 'alt', 'shift'].includes(p)) || '',
    };
};

/**
 * 检查事件是否匹配快捷键
 */
const matchesKeyCombo = (event, combo) => {
    const parsed = parseKeyCombo(combo);
    const modPressed = isMac() ? event.metaKey : event.ctrlKey;

    return (
        event.key.toLowerCase() === parsed.key &&
        (parsed.mod ? modPressed : true) &&
        (parsed.shift ? event.shiftKey : !event.shiftKey) &&
        (parsed.alt ? event.altKey : !event.altKey)
    );
};

/**
 * useBrowserIntercept - 拦截浏览器默认快捷键
 * 
 * 在 App 根部使用，防止 Cmd+S 保存网页、Cmd+P 打印等行为
 */
export const useBrowserIntercept = () => {
    useEffect(() => {
        const handleKeyDown = (event) => {
            // 检查是否匹配需要拦截的快捷键
            const shouldIntercept = BROWSER_INTERCEPTS.some(combo =>
                matchesKeyCombo(event, combo)
            );

            if (shouldIntercept) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        // 使用 capture 阶段确保最先处理
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, []);
};

export default useBrowserIntercept;
