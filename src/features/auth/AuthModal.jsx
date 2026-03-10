import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from './AuthContext';

const ALLOWED_DOMAINS = [
    'gmail.com', 'googlemail.com',
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
    'yahoo.com', 'ymail.com',
    'icloud.com', 'me.com', 'mac.com',
    'proton.me', 'protonmail.com',
    'qq.com', 'foxmail.com',
    '163.com', '126.com', 'yeah.net',
    'sina.com', 'sohu.com',
    'naver.com'
];

const validateEmailDomain = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return Boolean(domain && ALLOWED_DOMAINS.includes(domain));
};

const AuthModal = ({ isOpen, onClose }) => {
    const { login, register, loginWithGoogle, logout, user } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
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
            setError(currentError.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            onClose();
        } catch (currentError) {
            setError(currentError.message);
        }
    };

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

                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <span className="text-2xl font-bold">{user.email?.[0]?.toUpperCase()}</span>
                    </div>

                    <h2 className="mb-1 text-xl font-medium text-gray-900">云端同步已启用</h2>
                    <p className="mb-6 text-sm text-gray-500">{user.email}</p>

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
                            <h2 className="text-2xl font-light leading-tight text-gray-900">
                                {isLogin ? '登录云端同步' : '创建同步账户'}
                            </h2>
                            <p className="mt-1 text-sm text-gray-400">
                                {isLogin ? '在多设备之间同步灵感与数据' : '为 Light 开启独立同步空间'}
                            </p>
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

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-400">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-gray-700 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-400">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-4 text-gray-700 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-4 font-medium tracking-wide text-white shadow-lg shadow-gray-900/20 transition-all hover:bg-black disabled:opacity-70"
                        >
                            {loading ? '处理中...' : (isLogin ? '登录' : '创建账户')}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="h-px flex-1 bg-gray-100" />
                        <span className="font-mono text-xs text-gray-400">OR</span>
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

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setIsLogin((current) => !current)}
                            className="text-sm text-gray-500 underline underline-offset-4 hover:text-gray-900"
                        >
                            {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthModal;
