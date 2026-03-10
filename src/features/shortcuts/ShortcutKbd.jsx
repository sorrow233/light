import React, { useMemo } from 'react';

/**
 * 检测是否为 Mac 系统
 */
const isMac = () => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

/**
 * 将快捷键字符串转换为平台特定的显示格式
 */
const formatKeyForPlatform = (key) => {
    const isApple = isMac();

    const keyMap = {
        'mod': isApple ? '⌘' : 'Ctrl',
        'ctrl': 'Ctrl',
        'alt': isApple ? '⌥' : 'Alt',
        'shift': isApple ? '⇧' : 'Shift',
        'escape': 'Esc',
        'enter': isApple ? '↩' : 'Enter',
        'backspace': isApple ? '⌫' : 'Backspace',
        'delete': isApple ? '⌦' : 'Del',
        'tab': isApple ? '⇥' : 'Tab',
        'space': 'Space',
        'arrowup': '↑',
        'arrowdown': '↓',
        'arrowleft': '←',
        'arrowright': '→',
    };

    const lowerKey = key.toLowerCase();
    return keyMap[lowerKey] || key.toUpperCase();
};

/**
 * 解析快捷键组合并返回格式化的按键数组
 */
const parseAndFormatCombo = (combo) => {
    const parts = combo.toLowerCase().split('+');
    const modifiers = [];
    let mainKey = '';

    parts.forEach(part => {
        if (['mod', 'ctrl', 'alt', 'shift'].includes(part)) {
            modifiers.push(formatKeyForPlatform(part));
        } else {
            mainKey = formatKeyForPlatform(part);
        }
    });

    return [...modifiers, mainKey];
};

/**
 * ShortcutKbd - 跨平台快捷键显示组件
 * 
 * @param {string} shortcut - 快捷键字符串，如 'mod+s' 或 'mod+shift+z'
 * @param {string} className - 额外的 CSS 类名
 * @param {string} size - 尺寸：'sm' | 'md' | 'lg'
 * 
 * @example
 * <ShortcutKbd shortcut="mod+s" />
 * <ShortcutKbd shortcut="mod+shift+z" size="lg" />
 */
const ShortcutKbd = ({ shortcut, className = '', size = 'sm' }) => {
    const keys = useMemo(() => parseAndFormatCombo(shortcut), [shortcut]);
    const isApple = isMac();

    const sizeClasses = {
        sm: 'text-[10px] px-1.5 py-0.5 min-w-[18px]',
        md: 'text-xs px-2 py-1 min-w-[22px]',
        lg: 'text-sm px-2.5 py-1.5 min-w-[28px]',
    };

    const gapClasses = {
        sm: 'gap-0.5',
        md: 'gap-1',
        lg: 'gap-1.5',
    };

    return (
        <span className={`inline-flex items-center ${gapClasses[size]} ${className}`}>
            {keys.map((key, index) => (
                <kbd
                    key={index}
                    className={`
                        inline-flex items-center justify-center
                        ${sizeClasses[size]}
                        font-mono font-medium
                        bg-gray-100 text-gray-600
                        border border-gray-200
                        rounded shadow-sm
                        ${isApple && ['⌘', '⌥', '⇧', '⌃'].includes(key) ? 'font-sans' : ''}
                    `}
                >
                    {key}
                </kbd>
            ))}
        </span>
    );
};

/**
 * ShortcutKbdFromAction - 根据 actionId 显示快捷键
 * 
 * @param {string} actionId - keymap.config.js 中的 action ID
 */
export const ShortcutKbdFromAction = ({ actionId, className = '', size = 'sm' }) => {
    // 动态导入以避免循环依赖
    const { KEYMAP } = require('./keymap.config');
    const config = KEYMAP[actionId];

    if (!config || !config.keys.length) {
        return null;
    }

    // 使用第一个快捷键组合
    return <ShortcutKbd shortcut={config.keys[0]} className={className} size={size} />;
};

export default ShortcutKbd;
