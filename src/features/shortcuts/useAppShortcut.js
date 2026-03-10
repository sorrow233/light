import { useEffect, useCallback, useRef } from 'react';
import { KEYMAP } from './keymap.config';
import { useKeymapContext } from './KeymapContext';

/**
 * 检测是否为 Mac 系统
 */
const isMac = () => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

/**
 * 解析快捷键字符串为标准化格式
 * 例如: 'mod+shift+z' => { mod: true, shift: true, key: 'z' }
 */
const parseKeyCombo = (combo) => {
    const parts = combo.toLowerCase().split('+');
    const result = {
        ctrl: false,
        mod: false,
        alt: false,
        shift: false,
        key: '',
    };

    parts.forEach(part => {
        switch (part) {
            case 'mod':
                result.mod = true;
                break;
            case 'ctrl':
                result.ctrl = true;
                break;
            case 'alt':
                result.alt = true;
                break;
            case 'shift':
                result.shift = true;
                break;
            default:
                result.key = part;
        }
    });

    return result;
};

/**
 * 检查键盘事件是否匹配快捷键组合
 */
const matchesKeyCombo = (event, combo) => {
    const parsed = parseKeyCombo(combo);
    const eventKey = event.key.toLowerCase();

    // 处理特殊键
    let keyMatches = false;
    if (parsed.key === 'escape') {
        keyMatches = event.key === 'Escape';
    } else if (parsed.key === '?') {
        // Shift + / 会产生 ?
        keyMatches = eventKey === '?' || (event.shiftKey && eventKey === '/');
    } else {
        keyMatches = eventKey === parsed.key;
    }

    // 处理 mod 键（Mac: metaKey, Windows: ctrlKey）
    const modPressed = isMac() ? event.metaKey : event.ctrlKey;
    const modMatches = parsed.mod ? modPressed : !modPressed || parsed.ctrl;

    // 处理 ctrl 键（Windows 专用）
    const ctrlMatches = parsed.ctrl ? event.ctrlKey : true;

    // 处理 alt 键
    const altMatches = parsed.alt ? event.altKey : !event.altKey;

    // 处理 shift 键
    const shiftMatches = parsed.shift ? event.shiftKey : (!event.shiftKey || parsed.key === '?');

    return keyMatches && modMatches && ctrlMatches && altMatches && shiftMatches;
};

/**
 * useAppShortcut - 统一的快捷键 Hook
 * 
 * @param {string} actionId - 在 keymap.config.js 中定义的 action ID
 * @param {Function} callback - 快捷键触发时的回调
 * @param {Object} options - 可选配置
 * @param {boolean} options.enabled - 是否启用，默认 true
 * @param {boolean} options.preventDefault - 是否阻止默认行为，默认 true
 * @param {boolean} options.allowInInput - 是否在输入框中也触发，默认 false
 * 
 * @example
 * useAppShortcut('UNDO', () => handleUndo());
 * useAppShortcut('SAVE', () => handleSave(), { enabled: isModified });
 */
export const useAppShortcut = (actionId, callback, options = {}) => {
    const {
        enabled = true,
        preventDefault = true,
        allowInInput = false,
    } = options;

    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    // 尝试获取 context（可能不存在）
    let context = null;
    try {
        context = useKeymapContext();
    } catch {
        // 如果没有 Provider，使用默认行为
    }

    const handleKeyDown = useCallback((event) => {
        if (!enabled) return;

        // 获取 action 配置
        const config = KEYMAP[actionId];
        if (!config) {
            console.warn(`[useAppShortcut] Unknown actionId: ${actionId}`);
            return;
        }

        // 🔥 IME 防御：日文/中文输入法组合过程中不触发
        if (event.isComposing || event.nativeEvent?.isComposing) {
            return;
        }

        // 作用域检查
        if (context && !context.isScopeActive(config.scope)) {
            return;
        }

        // 输入框检查
        if (!allowInInput) {
            const activeElement = document.activeElement;
            const isInput = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            );
            if (isInput) return;
        }

        // 检查是否匹配任一快捷键组合
        const matched = config.keys.some(combo => matchesKeyCombo(event, combo));

        if (matched) {
            if (preventDefault) {
                event.preventDefault();
                event.stopPropagation();
            }
            callbackRef.current(event);
        }
    }, [actionId, enabled, preventDefault, allowInInput, context]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

/**
 * useMultipleShortcuts - 同时注册多个快捷键
 * 
 * @param {Object} shortcuts - { actionId: callback } 的对象
 * @param {Object} options - 同 useAppShortcut 的 options
 */
export const useMultipleShortcuts = (shortcuts, options = {}) => {
    const {
        enabled = true,
        preventDefault = true,
        allowInInput = false,
    } = options;

    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    let context = null;
    try {
        context = useKeymapContext();
    } catch {
        // 如果没有 Provider，使用默认行为
    }

    const handleKeyDown = useCallback((event) => {
        if (!enabled) return;

        // 🔥 IME 防御
        if (event.isComposing || event.nativeEvent?.isComposing) {
            return;
        }

        // 输入框检查
        if (!allowInInput) {
            const activeElement = document.activeElement;
            const isInput = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            );
            if (isInput) return;
        }

        // 遍历所有注册的快捷键
        Object.entries(shortcutsRef.current).forEach(([actionId, callback]) => {
            const config = KEYMAP[actionId];
            if (!config) return;

            // 作用域检查
            if (context && !context.isScopeActive(config.scope)) {
                return;
            }

            const matched = config.keys.some(combo => matchesKeyCombo(event, combo));

            if (matched) {
                if (preventDefault) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                callback(event);
            }
        });
    }, [enabled, preventDefault, allowInInput, context]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

export default useAppShortcut;
