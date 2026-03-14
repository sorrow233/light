import React from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';

const PasswordAuthForm = ({
    isLogin,
    email,
    password,
    onEmailChange,
    onPasswordChange,
    onSubmit,
    loading,
    onToggleMode,
}) => {
    return (
        <>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="ml-1 text-xs font-bold uppercase tracking-wider text-gray-400">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => onEmailChange(event.target.value)}
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
                            onChange={(event) => onPasswordChange(event.target.value)}
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

            <div className="mt-8 text-center">
                <button
                    onClick={onToggleMode}
                    className="text-sm text-gray-500 underline underline-offset-4 hover:text-gray-900"
                >
                    {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
                </button>
            </div>
        </>
    );
};

export default PasswordAuthForm;
