import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from '../../hooks/ThemeContext';
import PasswordAuthForm from './PasswordAuthForm';
import MagicLinkAuthForm from './MagicLinkAuthForm';
import { validateEmailDomain } from './authEmailDomains';
import { normalizeAuthError } from './authMessages';

const AuthModal = ({ isOpen, onClose }) => {
    const { login, register, loginWithGoogle, logout, user, sendEmailLoginLink } = useAuth();
    const { accentTheme, accentThemeOptions, setAccentTheme } = useTheme();
    const [isLogin, setIsLogin] = useState(true);
    const [authMethod, setAuthMethod] = useState('magic-link');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setNotice('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (!validateEmailDomain(email)) {
                    throw new Error('注册暂时只支持主流邮箱服务商，请使用常见邮箱地址。');
                }
                await register(email, password);
            }
            onClose();
        } catch (currentError) {
            setError(normalizeAuthError(currentError));
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLinkSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setNotice('');
        setLoading(true);

        try {
            const sentTo = await sendEmailLoginLink(email);
            setNotice(`已发送到 ${sentTo}，去邮箱打开登录链接即可。`);
        } catch (currentError) {
            setError(normalizeAuthError(currentError));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setNotice('');

        try {
            await loginWithGoogle();
            onClose();
        } catch (currentError) {
            setError(normalizeAuthError(currentError));
        }
    };

    const modalTitle = authMethod === 'magic-link'
        ? '邮箱免密登录'
        : (isLogin ? '登录云端同步' : '创建同步账户');

    const modalDescription = authMethod === 'magic-link'
        ? '打开邮箱点一下链接，就能直接登录 Light'
        : (isLogin ? '在多设备之间同步灵感与数据' : '为 Light 开启独立同步空间');

    if (!isOpen) return null;

    if (user) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl"
                >
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-gray-100"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>

                    <div
                        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
                        style={{
                            backgroundColor: 'var(--accent-soft-bg-strong)',
                            color: 'var(--accent-600)',
                        }}
                    >
                        <span className="text-2xl font-bold">{user.email?.[0]?.toUpperCase() || 'L'}</span>
                    </div>

                    <h2 className="mb-1 text-xl font-medium text-gray-900">云端同步已启用</h2>
                    <p className="mb-5 text-sm text-gray-500">{user.email}</p>

                    <div className="mb-6 flex items-center justify-center gap-2.5">
                        <span className="text-xs font-medium tracking-[0.18em] text-gray-400">主题色</span>
                        <div className="flex items-center gap-2">
                            {accentThemeOptions.map((option) => {
                                const isActive = accentTheme === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setAccentTheme(option.id)}
                                        title={option.label}
                                        aria-label={`切换到${option.label}主题`}
                                        className="relative h-6 w-6 rounded-full transition-all duration-200"
                                        style={{
                                            backgroundColor: option.swatch,
                                            opacity: isActive ? 1 : 0.72,
                                            transform: isActive ? 'scale(1.08)' : 'scale(1)',
                                            boxShadow: isActive
                                                ? '0 0 0 3px #ffffff, 0 0 0 4px rgba(148,163,184,0.24), 0 10px 18px -14px rgba(15,23,42,0.28)'
                                                : '0 0 0 1px rgba(148,163,184,0.16)',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            logout();
                            onClose();
                        }}
                        className="w-full rounded-xl bg-red-50 py-3 font-medium text-red-500 transition-colors hover:bg-red-100"
                    >
                        退出登录
                    </button>

                    <button
                        onClick={onClose}
                        className="mt-3 w-full py-3 font-medium text-gray-400 transition-colors hover:text-gray-600"
                    >
                        关闭
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
                <div className="p-8">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-light leading-tight text-gray-900">{modalTitle}</h2>
                            <p className="mt-1 text-sm text-gray-400">{modalDescription}</p>
                        </div>
                        <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-gray-100">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-500">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mb-6 inline-flex rounded-2xl bg-gray-100 p-1">
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMethod('magic-link');
                                setIsLogin(true);
                                setError('');
                                setNotice('');
                            }}
                            className={`rounded-2xl px-4 py-2 text-sm transition-all ${
                                authMethod === 'magic-link'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            邮箱免密
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMethod('password');
                                setError('');
                                setNotice('');
                            }}
                            className={`rounded-2xl px-4 py-2 text-sm transition-all ${
                                authMethod === 'password'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            密码登录
                        </button>
                    </div>

                    {authMethod === 'magic-link' ? (
                        <MagicLinkAuthForm
                            email={email}
                            onEmailChange={setEmail}
                            onSubmit={handleMagicLinkSubmit}
                            loading={loading}
                            notice={notice}
                        />
                    ) : (
                        <PasswordAuthForm
                            isLogin={isLogin}
                            email={email}
                            password={password}
                            onEmailChange={setEmail}
                            onPasswordChange={setPassword}
                            onSubmit={handlePasswordSubmit}
                            loading={loading}
                            onToggleMode={() => {
                                setIsLogin((current) => !current);
                                setError('');
                                setNotice('');
                            }}
                        />
                    )}

                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px flex-1 bg-gray-100" />
                        <span className="font-mono text-xs text-gray-400">或</span>
                        <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-gray-600 transition-all hover:bg-gray-50"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.66.81-.18z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        使用 Google 登录
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthModal;
