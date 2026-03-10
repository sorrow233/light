/**
 * ShareReceiver - Web Share Target 接收页面
 * 
 * 当用户从其他 APP 通过 iOS 共享菜单分享内容到 Light 时，
 * 系统会打开此页面并传入共享参数。
 * 
 * 支持的参数：
 * - title: 共享标题
 * - text: 共享文本内容
 * - url: 共享链接
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Share2 } from 'lucide-react';

const ShareReceiver = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('processing'); // processing | success | error

    useEffect(() => {
        // 解析共享参数
        const title = searchParams.get('title') || '';
        const text = searchParams.get('text') || '';
        const url = searchParams.get('url') || '';

        // 合并内容
        let content = '';
        if (title) content += title;
        if (text) content += (content ? '\n\n' : '') + text;
        if (url) content += (content ? '\n\n' : '') + url;

        // 如果没有任何内容，直接跳转
        if (!content.trim()) {
            navigate('/inspiration', { replace: true });
            return;
        }

        // 使用现有的 import_text 机制跳转到 Inspiration 页面
        // 这样可以复用已有的添加逻辑
        const encodedContent = encodeURIComponent(content.trim());

        // 短暂显示接收成功UI后跳转
        setStatus('success');

        const timer = setTimeout(() => {
            navigate(`/inspiration?import_text=${encodedContent}`, { replace: true });
        }, 800);

        return () => clearTimeout(timer);
    }, [searchParams, navigate]);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
            >
                {status === 'processing' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center">
                            <Share2 className="w-8 h-8 text-pink-500" />
                        </div>
                        <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            正在接收共享内容...
                        </p>
                    </motion.div>
                )}

                {status === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center"
                        >
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </motion.div>
                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                            已添加到灵感库
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default ShareReceiver;
