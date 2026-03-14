import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    isSignInWithEmailLink,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    createUserWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import {
    buildEmailLinkActionSettings,
    clearEmailLinkUrl,
    clearRememberedEmailLinkEmail,
    getRememberedEmailLinkEmail,
    rememberEmailLinkEmail,
} from './authEmailLink';
import { normalizeAuthError } from './authMessages';
import { normalizeAuthEmail, validateEmailDomain } from './authEmailDomains';

const AuthContext = createContext({});
const DEFAULT_EMAIL_LINK_STATE = {
    status: 'idle',
    error: '',
    email: '',
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isEmailLinkReady, setIsEmailLinkReady] = useState(typeof window === 'undefined');
    const [emailLinkState, setEmailLinkState] = useState(DEFAULT_EMAIL_LINK_STATE);
    const emailLinkInitRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
        });

        return unsubscribe;
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const register = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const logout = () => {
        return signOut(auth);
    };

    const loginWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    };

    const sendEmailLoginLink = useCallback(async (email) => {
        const normalizedEmail = normalizeAuthEmail(email);
        if (!validateEmailDomain(normalizedEmail)) {
            throw new Error('免密登录暂时只支持主流邮箱服务商，请使用常见邮箱地址。');
        }

        await sendSignInLinkToEmail(auth, normalizedEmail, buildEmailLinkActionSettings());
        rememberEmailLinkEmail(normalizedEmail);
        return normalizedEmail;
    }, []);

    const dismissEmailLinkState = useCallback(() => {
        setEmailLinkState(DEFAULT_EMAIL_LINK_STATE);
    }, []);

    const completeEmailLinkSignIn = useCallback(async (emailInput) => {
        if (typeof window === 'undefined' || !isSignInWithEmailLink(auth, window.location.href)) {
            setEmailLinkState(DEFAULT_EMAIL_LINK_STATE);
            return null;
        }

        const normalizedEmail = normalizeAuthEmail(emailInput || getRememberedEmailLinkEmail());
        if (!normalizedEmail) {
            setEmailLinkState({
                status: 'needs_email',
                error: '为了安全起见，请再次输入接收登录邮件的邮箱地址。',
                email: '',
            });
            return null;
        }

        setEmailLinkState({
            status: 'processing',
            error: '',
            email: normalizedEmail,
        });

        try {
            const credential = await signInWithEmailLink(auth, normalizedEmail, window.location.href);
            clearRememberedEmailLinkEmail();
            clearEmailLinkUrl();
            setEmailLinkState(DEFAULT_EMAIL_LINK_STATE);
            return credential;
        } catch (error) {
            const errorCode = typeof error?.code === 'string' ? error.code : '';

            if (errorCode === 'auth/invalid-email' || errorCode === 'auth/missing-email') {
                setEmailLinkState({
                    status: 'needs_email',
                    error: '请输入接收登录邮件的邮箱地址，再完成这次登录。',
                    email: normalizedEmail,
                });
                return null;
            }

            if (errorCode === 'auth/invalid-action-code' || errorCode === 'auth/expired-action-code') {
                clearRememberedEmailLinkEmail();
                clearEmailLinkUrl();
            }

            setEmailLinkState({
                status: 'error',
                error: normalizeAuthError(error),
                email: normalizedEmail,
            });
            return null;
        }
    }, []);

    useEffect(() => {
        if (emailLinkInitRef.current) return;
        emailLinkInitRef.current = true;

        let cancelled = false;

        const resolveEmailLink = async () => {
            if (typeof window === 'undefined' || !isSignInWithEmailLink(auth, window.location.href)) {
                if (!cancelled) {
                    setIsEmailLinkReady(true);
                }
                return;
            }

            const rememberedEmail = getRememberedEmailLinkEmail();

            if (!rememberedEmail) {
                if (!cancelled) {
                    setEmailLinkState({
                        status: 'needs_email',
                        error: '为了安全起见，请再次输入接收登录邮件的邮箱地址。',
                        email: '',
                    });
                    setIsEmailLinkReady(true);
                }
                return;
            }

            await completeEmailLinkSignIn(rememberedEmail);

            if (!cancelled) {
                setIsEmailLinkReady(true);
            }
        };

        void resolveEmailLink();

        return () => {
            cancelled = true;
        };
    }, [completeEmailLinkSignIn]);

    const loading = !isAuthReady || !isEmailLinkReady;

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
                loginWithGoogle,
                sendEmailLoginLink,
                completeEmailLinkSignIn,
                dismissEmailLinkState,
                emailLinkState,
            }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
};
