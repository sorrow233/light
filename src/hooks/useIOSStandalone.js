/**
 * useIOSStandalone - iOS PWA Standalone 模式检测 Hook
 *
 * 用于检测当前设备是否为 iOS 以及是否以 standalone 模式运行（从主屏幕打开）
 * PC 端始终返回 false，不会影响 PC 端的 UI 和行为
 */

import { useState, useEffect } from 'react';

/**
 * 检测是否为 iOS 设备
 */
export const detectIsIOS = () => {
    if (typeof navigator === 'undefined') return false;
    return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * 检测是否为 iOS Safari
 */
export const detectIsIOSSafari = () => {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent;
    const isIOS = detectIsIOS();
    const isWebKit = /WebKit/i.test(userAgent);
    const isOtherShell = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser/i.test(userAgent);
    return isIOS && isWebKit && !isOtherShell;
};

/**
 * 检测是否以 standalone 模式运行（PWA 从主屏幕打开）
 */
export const detectIsStandalone = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
};

/**
 * iOS Standalone 模式检测 Hook
 *
 * @returns {{
 *   isIOS: boolean,           // 是否为 iOS 设备
 *   isIOSSafari: boolean,     // 是否为 iOS Safari
 *   isStandalone: boolean,    // 是否以 standalone 模式运行
 *   isIOSStandalone: boolean  // isIOS && isStandalone 的组合判断
 * }}
 *
 * @example
 * const { isIOSStandalone } = useIOSStandalone();
 * // 在 standalone 模式下添加额外的顶部 padding
 * <div className={isIOSStandalone ? 'pt-safe' : ''}>
 */
export function useIOSStandalone() {
    const [state, setState] = useState({
        isIOS: false,
        isIOSSafari: false,
        isStandalone: false,
        isIOSStandalone: false,
    });

    useEffect(() => {
        const isIOS = detectIsIOS();
        const isIOSSafari = detectIsIOSSafari();
        const isStandalone = detectIsStandalone();

        setState({
            isIOS,
            isIOSSafari,
            isStandalone,
            isIOSStandalone: isIOS && isStandalone,
        });
    }, []);

    return state;
}

/**
 * 非 Hook 版本的检测函数，用于在组件外部调用
 */
export const getIOSStandaloneStatus = () => ({
    isIOS: detectIsIOS(),
    isIOSSafari: detectIsIOSSafari(),
    isStandalone: detectIsStandalone(),
    isIOSStandalone: detectIsIOS() && detectIsStandalone(),
});

export default useIOSStandalone;
