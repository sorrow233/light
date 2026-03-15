import { useEffect, useState } from 'react';
import { useIOSStandalone } from '../../hooks/useIOSStandalone';

const IOS_ADD_TO_HOME_PROMPT_KEY = 'light_ios_add_to_home_prompt_v1';
const PROMPT_DELAY_MS = 1400;

const getStoredPromptState = () => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(IOS_ADD_TO_HOME_PROMPT_KEY);
};

const setStoredPromptState = (value) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(IOS_ADD_TO_HOME_PROMPT_KEY, value);
};

export function useIOSAddToHomePrompt() {
    const { isIOS, isIOSSafari, isStandalone } = useIOSStandalone();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isStandalone) {
            setStoredPromptState('installed');
            setIsVisible(false);
            return undefined;
        }

        if (!isIOS || !isIOSSafari || getStoredPromptState()) {
            setIsVisible(false);
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setStoredPromptState('shown');
            setIsVisible(true);
        }, PROMPT_DELAY_MS);

        return () => window.clearTimeout(timeoutId);
    }, [isIOS, isIOSSafari, isStandalone]);

    const dismissPrompt = () => {
        setStoredPromptState('dismissed');
        setIsVisible(false);
    };

    return {
        isVisible,
        dismissPrompt,
        isEligible: isIOS && isIOSSafari && !isStandalone,
    };
}

export default useIOSAddToHomePrompt;
