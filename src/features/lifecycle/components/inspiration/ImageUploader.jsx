import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect, memo } from 'react';
import { Image, X, Loader2, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../auth/AuthContext';

/**
 * 图片上传组件
 * 
 * 功能：
 * - 点击选择图片
 * - 拖拽上传
 * - 粘贴上传（通过 ref.uploadFromClipboard）
 * - 客户端图片压缩（最大 1920px）
 * - 上传进度显示
 * - 成功/失败反馈
 * - 白名单权限检查（服务端验证）
 */
const ImageUploaderInner = forwardRef(({ onUploadComplete, disabled = false }, ref) => {
    const { user } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);
    const errorTimerRef = useRef(null);
    const successTimerRef = useRef(null);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
            if (successTimerRef.current) clearTimeout(successTimerRef.current);
        };
    }, []);

    // 显示错误（3秒后自动消失）
    const showError = useCallback((message) => {
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        setError(message);
        errorTimerRef.current = setTimeout(() => {
            setError(null);
        }, 3000);
    }, []);

    // 显示成功（1.5秒后自动消失）
    const showSuccess = useCallback(() => {
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        setSuccess(true);
        successTimerRef.current = setTimeout(() => {
            setSuccess(false);
        }, 1500);
    }, []);

    /**
     * 转换图片为 WebP 格式（保持原尺寸）
     */
    const compressImage = useCallback((file, quality = 0.86) => {
        return new Promise((resolve, reject) => {
            const img = new window.Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                // 保持原尺寸
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // 输出 WebP 格式
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const fileName = (file.name || 'pasted-image').replace(/\.[^.]+$/, '') + '.webp';
                            resolve(new File([blob], fileName, { type: 'image/webp' }));
                        } else {
                            reject(new Error('图片转换失败'));
                        }
                    },
                    'image/webp',
                    quality
                );
            };

            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = URL.createObjectURL(file);
        });
    }, []);

    /**
     * 上传图片到 R2
     */
    const uploadImage = useCallback(async (file) => {
        if (!user?.uid) {
            showError('请先登录');
            return false;
        }

        if (!file || !file.type.startsWith('image/')) {
            showError('请上传图片文件');
            return false;
        }

        // 检查文件大小（前端预检，限制 15MB 原图）
        if (file.size > 15 * 1024 * 1024) {
            showError('图片太大，请选择小于 15MB 的图片');
            return false;
        }

        setIsUploading(true);
        setError(null);
        setSuccess(false);

        try {
            // 压缩图片
            const compressedFile = await compressImage(file);

            // 构建 FormData
            const formData = new FormData();
            formData.append('file', compressedFile);

            // 发送上传请求
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.uid}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                // 友好化错误信息
                let errorMsg = result.error || '上传失败';
                if (errorMsg.includes('whitelist')) {
                    errorMsg = '没有上传权限';
                } else if (errorMsg.includes('R2')) {
                    errorMsg = '存储服务异常，请稍后重试';
                } else if (errorMsg.includes('configuration')) {
                    errorMsg = '服务配置错误';
                }
                throw new Error(errorMsg);
            }

            // 回调通知上传成功
            onUploadComplete?.(result.url);
            showSuccess();
            return true;

        } catch (err) {
            console.error('Upload error:', err);
            showError(err.message || '上传失败');
            return false;
        } finally {
            setIsUploading(false);
        }
    }, [user, compressImage, onUploadComplete, showError, showSuccess]);

    /**
     * 从剪贴板数据中提取并上传图片
     */
    const uploadFromClipboard = useCallback(async (clipboardData) => {
        if (!clipboardData?.items) return false;

        for (const item of clipboardData.items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    return await uploadImage(file);
                }
            }
        }
        return false;
    }, [uploadImage]);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        uploadImage,
        uploadFromClipboard,
        isUploading
    }), [uploadImage, uploadFromClipboard, isUploading]);

    /**
     * 处理文件选择
     */
    const handleFileSelect = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadImage(file);
        }
        // 重置 input 以便可以选择同一文件
        e.target.value = '';
    }, [uploadImage]);

    /**
     * 处理拖拽
     */
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            uploadImage(file);
        } else {
            showError('请上传图片文件');
        }
    }, [uploadImage, showError]);

    /**
     * 点击按钮触发文件选择
     */
    const handleClick = useCallback(() => {
        if (!disabled && !isUploading) {
            fileInputRef.current?.click();
        }
    }, [disabled, isUploading]);

    // 计算按钮状态样式
    const getButtonStyle = () => {
        if (success) return 'bg-green-100 dark:bg-green-900/40 ring-2 ring-green-400';
        if (isDragOver) return 'bg-pink-100 dark:bg-pink-900/40 ring-2 ring-pink-400 scale-105';
        if (isUploading) return 'bg-pink-50 dark:bg-pink-900/30';
        return 'bg-gray-50/50 dark:bg-gray-800/50 hover:bg-pink-50 dark:hover:bg-pink-900/20';
    };

    return (
        <div className="relative">
            {/* 隐藏的文件输入 */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* 上传按钮 */}
            <motion.button
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={disabled || isUploading}
                whileHover={{ scale: disabled || isUploading ? 1 : 1.03 }}
                whileTap={{ scale: disabled || isUploading ? 1 : 0.97 }}
                className={`
                    relative p-2 rounded-xl transition-all duration-300
                    ${getButtonStyle()}
                    ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    border border-gray-100/50 dark:border-gray-700/50
                    hover:border-pink-200 dark:hover:border-pink-800
                    shadow-sm hover:shadow-md
                    group
                `}
                title="上传图片 (支持粘贴 Cmd+V)"
            >
                {isUploading ? (
                    <Loader2 size={14} className="text-pink-500 animate-spin" />
                ) : success ? (
                    <Check size={14} className="text-green-500" />
                ) : (
                    <Image
                        size={14}
                        className={`
                            transition-colors
                            ${isDragOver
                                ? 'text-pink-500'
                                : 'text-gray-400 group-hover:text-pink-500'
                            }
                        `}
                    />
                )}
            </motion.button>

            {/* 错误提示 */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-100 dark:border-red-800 shadow-lg whitespace-nowrap"
                    >
                        <AlertCircle size={12} />
                        <span>{error}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setError(null);
                                if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
                            }}
                            className="ml-1 p-0.5 hover:bg-red-100 dark:hover:bg-red-800/50 rounded"
                        >
                            <X size={10} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

ImageUploaderInner.displayName = 'ImageUploader';

const ImageUploader = memo(ImageUploaderInner);
ImageUploader.displayName = 'ImageUploader';

export default ImageUploader;

