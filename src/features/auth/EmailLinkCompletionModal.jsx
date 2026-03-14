import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from './AuthContext';

const EmailLinkCompletionModal = () => {
    const {
        emailLinkState,
        completeEmailLinkSignIn,
        dismissEmailLinkState,
    } = useAuth();
    const [email, setEmail] = useState(emailLinkState.email || '');
    const [loading, setLoading] = useState(false);

    const isPromptOpen = emailLinkState.status === 'needs_email';
    const isErrorOpen = emailLinkState.status === 'error';
    const isOpen = isPromptOpen || isErrorOpen;

    useEffect(() => {
        if (isPromptOpen) {
            setEmail(emailLinkState.email || '');
        }
    }, [emailLinkState.email, isPromptOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);

        try {
            await completeEmailLinkSignIn(email);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
                <div className="p-8">
                    <button
                        onClick={dismissEmailLinkState}
                        className="absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-gray-100"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>

                    <div className="mb-6">
                        <h2 className="text-2xl font-light leading-tight text-gray-900">
                            {isPromptOpen ? '确认邮箱完成登录' : '免密登录没有完成'}
                        </h2>
                        <p className="mt-1 text-sm text-gray-400">
                            {isPromptOpen
                                ? '为了安全起见，请再输入一次收取登录邮件的邮箱地址。'
                                : '这次登录链接没有成功完成，你可以重新发送一封新的邮件。'}
                        </p>
                    </div>

                    <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-500">
                        {emailLinkState.error}
                    </div>

                    {isPromptOpen ? (
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

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-medium tracking-wide text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:opacity-70"
                            >
                                {loading ? '确认中...' : '完成登录'}
                                {!loading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    ) : (
                        <button
                            type="button"
                            onClick={dismissEmailLinkState}
                            className="w-full rounded-xl bg-gray-900 py-4 font-medium tracking-wide text-white shadow-lg shadow-gray-900/20 transition-all hover:bg-black"
                        >
                            返回应用
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default EmailLinkCompletionModal;
