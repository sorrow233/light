import React from 'react';
import { Mail, ArrowRight } from 'lucide-react';

const MagicLinkAuthForm = ({ email, onEmailChange, onSubmit, loading, notice }) => {
    return (
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

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-700">
                输入邮箱后，系统会发一封登录邮件给你。点开邮件里的链接，就能直接登录，不需要再记密码。
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                邮件会尽量按你当前语言发送。如果它被误判进垃圾邮件，先点一次“这不是垃圾邮件”，后面通常会稳定很多。
            </div>

            {notice && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                    {notice}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-medium tracking-wide text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:opacity-70"
            >
                {loading ? '发送中...' : (notice ? '重新发送登录链接' : '发送免密登录链接')}
                {!loading && <ArrowRight size={18} />}
            </button>
        </form>
    );
};

export default MagicLinkAuthForm;
