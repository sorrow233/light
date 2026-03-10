/**
 * Keymap Configuration - Single Source of Truth
 * 所有快捷键的集中配置
 */

// 作用域枚举
export const SCOPES = {
    GLOBAL: 'global',    // 全局可用
    EDITOR: 'editor',    // 编辑器上下文
    MODAL: 'modal',      // 弹窗内
    SIDEBAR: 'sidebar',  // 侧边栏
};

// 快捷键配置
// keys: 支持 'mod' (Mac: ⌘, Windows: Ctrl), 'alt', 'shift', 'ctrl'
export const KEYMAP = {
    // === 全局快捷键 ===
    UNDO: {
        keys: ['mod+z'],
        scope: SCOPES.GLOBAL,
        label: '撤销',
        labelEn: 'Undo',
    },
    REDO: {
        keys: ['mod+shift+z', 'ctrl+y'],
        scope: SCOPES.GLOBAL,
        label: '重做',
        labelEn: 'Redo',
    },
    SAVE: {
        keys: ['mod+s'],
        scope: SCOPES.GLOBAL,
        label: '保存',
        labelEn: 'Save',
    },
    HELP: {
        keys: ['shift+?'],
        scope: SCOPES.GLOBAL,
        label: '快捷键帮助',
        labelEn: 'Keyboard Shortcuts',
    },

    // === 弹窗快捷键 ===
    CLOSE_MODAL: {
        keys: ['escape'],
        scope: SCOPES.MODAL,
        label: '关闭弹窗',
        labelEn: 'Close Modal',
    },

    // === 编辑器快捷键 ===
    SELECT_ALL: {
        keys: ['mod+a'],
        scope: SCOPES.EDITOR,
        label: '全选',
        labelEn: 'Select All',
    },
    COPY: {
        keys: ['mod+c'],
        scope: SCOPES.EDITOR,
        label: '复制',
        labelEn: 'Copy',
    },
    PASTE: {
        keys: ['mod+v'],
        scope: SCOPES.EDITOR,
        label: '粘贴',
        labelEn: 'Paste',
    },
    CUT: {
        keys: ['mod+x'],
        scope: SCOPES.EDITOR,
        label: '剪切',
        labelEn: 'Cut',
    },
    FORMAT_BOLD: {
        keys: ['mod+b'],
        scope: SCOPES.EDITOR,
        label: '加粗',
        labelEn: 'Bold',
    },
    FORMAT_ITALIC: {
        keys: ['mod+i'],
        scope: SCOPES.EDITOR,
        label: '斜体',
        labelEn: 'Italic',
    },
    FORMAT_LINK: {
        keys: ['mod+k'],
        scope: SCOPES.EDITOR,
        label: '插入链接',
        labelEn: 'Insert Link',
    },
    FORMAT_INLINE_CODE: {
        keys: ['mod+e'],
        scope: SCOPES.EDITOR,
        label: '行内代码',
        labelEn: 'Inline Code',
    },
};

// 需要拦截的浏览器默认快捷键
export const BROWSER_INTERCEPTS = [
    'mod+s',  // 保存网页
    'mod+p',  // 打印
];

// 获取按 scope 分组的快捷键列表
export const getKeymapByScope = () => {
    const grouped = {};

    Object.entries(KEYMAP).forEach(([actionId, config]) => {
        const scope = config.scope;
        if (!grouped[scope]) {
            grouped[scope] = [];
        }
        grouped[scope].push({
            actionId,
            ...config,
        });
    });

    return grouped;
};

// Scope 显示名称
export const SCOPE_LABELS = {
    [SCOPES.GLOBAL]: { label: '全局', labelEn: 'Global' },
    [SCOPES.EDITOR]: { label: '编辑器', labelEn: 'Editor' },
    [SCOPES.MODAL]: { label: '弹窗', labelEn: 'Modal' },
    [SCOPES.SIDEBAR]: { label: '侧边栏', labelEn: 'Sidebar' },
};
