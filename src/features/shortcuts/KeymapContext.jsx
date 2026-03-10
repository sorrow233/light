import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { SCOPES } from './keymap.config';

const KeymapContext = createContext(null);

/**
 * KeymapProvider - 管理快捷键作用域的 Context Provider
 * 
 * 使用方法：
 * - 包裹在 App 根部
 * - 当弹窗打开时调用 pushScope('modal')
 * - 弹窗关闭时调用 popScope()
 */
export const KeymapProvider = ({ children }) => {
    // 作用域栈，默认只有 global
    const [scopeStack, setScopeStack] = useState([SCOPES.GLOBAL]);

    // 当前激活的作用域（栈顶）
    const activeScope = useMemo(() => {
        return scopeStack[scopeStack.length - 1];
    }, [scopeStack]);

    // 推入新作用域（例如打开弹窗时）
    const pushScope = useCallback((scope) => {
        setScopeStack(prev => [...prev, scope]);
    }, []);

    // 弹出作用域（例如关闭弹窗时）
    const popScope = useCallback(() => {
        setScopeStack(prev => {
            if (prev.length <= 1) return prev; // 保留至少 global
            return prev.slice(0, -1);
        });
    }, []);

    // 检查指定作用域是否激活
    const isScopeActive = useCallback((scope) => {
        // global 快捷键在任何情况下都激活
        if (scope === SCOPES.GLOBAL) return true;
        // 其他作用域只在当前激活时生效
        return activeScope === scope;
    }, [activeScope]);

    const value = useMemo(() => ({
        activeScope,
        scopeStack,
        pushScope,
        popScope,
        isScopeActive,
    }), [activeScope, scopeStack, pushScope, popScope, isScopeActive]);

    return (
        <KeymapContext.Provider value={value}>
            {children}
        </KeymapContext.Provider>
    );
};

/**
 * useKeymapContext - 获取快捷键上下文
 */
export const useKeymapContext = () => {
    const context = useContext(KeymapContext);
    if (!context) {
        throw new Error('useKeymapContext must be used within a KeymapProvider');
    }
    return context;
};

export default KeymapContext;
