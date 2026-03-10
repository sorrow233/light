import React from 'react';
import { createPortal } from 'react-dom';
import { INSPIRATION_CATEGORIES } from '../../../../utils/constants';

// Refined Color Configuration for "Crayon Highlighter" look
export const COLOR_CONFIG = [
    {
        id: 'pale-pink',
        dot: 'bg-[#F9DFDF]',
        highlight: 'rgba(249, 223, 223, 0.4)',
        glow: 'group-hover:ring-[#F9DFDF]/30 group-hover:shadow-[0_0_20px_rgba(249,223,223,0.3)]',
        border: 'hover:border-[#F9DFDF] dark:hover:border-[#F9DFDF]/50'
    },
    {
        id: 'light-red',
        dot: 'bg-[#FFA4A4]',
        highlight: 'rgba(255, 164, 164, 0.4)',
        glow: 'group-hover:ring-[#FFA4A4]/30 group-hover:shadow-[0_0_20px_rgba(255,164,164,0.3)]',
        border: 'hover:border-[#FFA4A4] dark:hover:border-[#FFA4A4]/50'
    },
    {
        id: 'salmon',
        dot: 'bg-[#FF8F8F]',
        highlight: 'rgba(255, 143, 143, 0.4)',
        glow: 'group-hover:ring-[#FF8F8F]/30 group-hover:shadow-[0_0_20px_rgba(255,143,143,0.3)]',
        border: 'hover:border-[#FF8F8F] dark:hover:border-[#FF8F8F]/50'
    },
    {
        id: 'violet',
        dot: 'bg-violet-400',
        highlight: 'rgba(167, 139, 250, 0.35)',
        glow: 'group-hover:ring-violet-400/30 group-hover:shadow-[0_0_20px_rgba(167,139,250,0.3)]',
        border: 'hover:border-violet-300 dark:hover:border-violet-700/50'
    },
    {
        id: 'pale-green',
        dot: 'bg-[#D9E9CF]',
        highlight: 'rgba(217, 233, 207, 0.4)',
        glow: 'group-hover:ring-[#D9E9CF]/30 group-hover:shadow-[0_0_20px_rgba(217,233,207,0.3)]',
        border: 'hover:border-[#D9E9CF] dark:hover:border-[#D9E9CF]/50'
    },
    {
        id: 'sky-blue',
        dot: 'bg-[#A5D8FF]',
        highlight: 'rgba(165, 216, 255, 0.4)',
        glow: 'group-hover:ring-[#A5D8FF]/30 group-hover:shadow-[0_0_20px_rgba(165,216,255,0.3)]',
        border: 'hover:border-[#A5D8FF] dark:hover:border-[#A5D8FF]/50'
    },
];

export const getColorConfig = (index) => COLOR_CONFIG[index % COLOR_CONFIG.length];

// 根据分类获取颜色配置
export const getCategoryConfig = (category, categories = INSPIRATION_CATEGORIES) => {
    const source = Array.isArray(categories) && categories.length > 0
        ? categories
        : INSPIRATION_CATEGORIES;

    const cat = source.find(c => c.id === category);
    if (cat) return cat;

    const fallbackNote = source.find(c => c.id === 'note');
    return fallbackNote || source[0] || INSPIRATION_CATEGORIES[0];
};

// 图片 URL 正则匹配（导出供外部使用）
export const IMAGE_URL_REGEX = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?)/gi;
export const R2_IMAGE_REGEX = /(https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^\s]+)/gi;
const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

// Helper for parsing rich text (with image support)
export const parseRichText = (text, allProjects = []) => {
    if (!text) return null;

    // 合并两种正则的匹配结果并去重
    const matches1 = text.match(IMAGE_URL_REGEX) || [];
    const matches2 = text.match(R2_IMAGE_REGEX) || [];
    const imageMatches = [...new Set([...matches1, ...matches2])];

    // 移除图片 URL 后的文本
    let textWithoutImages = text;
    imageMatches.forEach(url => {
        textWithoutImages = textWithoutImages.replace(url, '');
    });
    textWithoutImages = textWithoutImages.trim();

    const parts = textWithoutImages.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]|#![^:]+:[^#]+#)/g);

    const renderTextWithLinks = (part, index) => {
        const segments = part.split(URL_REGEX);

        return segments.map((segment, segIdx) => {
            if (!segment) return null;

            if (/^https?:\/\/\S+$/i.test(segment)) {
                const matched = segment.match(/^(https?:\/\/\S*?)([)。，；;!?]+)?$/i);
                const link = matched?.[1] || segment;
                const trailing = matched?.[2] || '';

                // Check if it's an internal writing link
                const isWritingLink = link.includes('/writing/c/') || link.includes('/writing/trash');

                if (isWritingLink) {
                    let docTitle = '写作文档';
                    try {
                        // Extract the docId from the URL structure /writing/c/:category/:docId
                        const parts = link.split('/writing/c/');
                        if (parts.length > 1) {
                            const pathSegments = parts[1].split('/');
                            if (pathSegments.length >= 2) {
                                const docId = pathSegments[1].split('?')[0].split('#')[0]; // clean trailing
                                const foundProject = (allProjects || []).find(p => p.id === docId);
                                if (foundProject) {
                                    docTitle = `写作文档: ${foundProject.title || '无标题文档'}`;
                                }
                            }
                        }
                    } catch (err) {
                        console.warn('Failed to parse writing writing link for title lookup', err);
                    }

                    return (
                        <React.Fragment key={`${index}-link-frag-${segIdx}`}>
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 bg-blue-50/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full text-[13px] font-medium border border-blue-200/60 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-800/40 hover:shadow-sm transition-all"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                title={link}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>
                                <span>{docTitle}</span>
                            </a>
                            {trailing ? <span>{trailing}</span> : null}
                        </React.Fragment>
                    );
                }

                return (
                    <React.Fragment key={`${index}-link-frag-${segIdx}`}>
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-500 dark:text-pink-300 underline decoration-pink-300/70 dark:decoration-pink-700/70 hover:text-pink-600 dark:hover:text-pink-200 break-all"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {link}
                        </a>
                        {trailing ? <span>{trailing}</span> : null}
                    </React.Fragment>
                );
            }

            return <span key={`${index}-text-${segIdx}`}>{segment}</span>;
        });
    };

    const textElements = parts.map((part, index) => {
        if (part.startsWith('#!') && part.endsWith('#')) {
            const match = part.match(/#!([^:]+):([^#]+)#/);
            if (match) {
                const [, colorId, content] = match;
                const colorConfig = COLOR_CONFIG.find(c => c.id === colorId) || COLOR_CONFIG[0];
                const highlightColor = colorConfig.highlight || 'rgba(167, 139, 250, 0.5)';
                return (
                    <span
                        key={index}
                        className="relative inline text-gray-800 dark:text-gray-100"
                        style={{
                            background: `radial-gradient(ellipse 100% 40% at center 80%, ${highlightColor} 0%, ${highlightColor} 70%, transparent 100%)`,
                            padding: '0 0.15em',
                        }}
                    >
                        {content}
                    </span>
                );
            }
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <code key={index} className="bg-pink-50/50 dark:bg-pink-900/20 px-1.5 py-0.5 rounded text-[13px] font-mono text-pink-600 dark:text-pink-400 mx-0.5 border border-pink-100/50 dark:border-pink-800/30">
                    {part.slice(1, -1)}
                </code>
            );
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <span key={index} className="font-bold text-gray-900 dark:text-gray-100 mx-0.5">
                    {part.slice(2, -2)}
                </span>
            );
        }
        if (part.startsWith('[') && part.endsWith(']')) {
            const tagName = part.slice(1, -1);
            return (
                <span
                    key={index}
                    className="inline-flex items-center px-1.5 py-0.5 mx-1 first:ml-0 bg-pink-100/50 dark:bg-pink-500/20 text-pink-600 dark:text-pink-300 rounded-[6px] text-[0.9em] font-normal align-baseline border border-pink-200/50 dark:border-pink-500/30 shadow-[0_1px_2px_rgba(244,114,182,0.1)] select-none transform translate-y-[-1px]"
                >
                    <span className="opacity-50 mr-0.5">#</span>
                    {tagName}
                </span>
            );
        }
        return <span key={index}>{renderTextWithLinks(part, index)}</span>;
    });

    // 如果有图片，添加图片元素
    if (imageMatches.length > 0) {
        const imageElements = imageMatches.map((url, idx) => (
            <InspirationImage key={`img-${idx}`} src={url} textContent={textWithoutImages} />
        ));

        return (
            <>
                {textElements}
                {imageElements.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {imageElements}
                    </div>
                )}
            </>
        );
    }

    return textElements;
};

// 复制图片到剪贴板的工具函数
export const copyImageToClipboard = async (src, textContent = '') => {
    try {
        // 通过 fetch 下载图片
        const response = await fetch(src);
        const blob = await response.blob();

        // 转为 PNG blob（Clipboard API 只支持 image/png）
        let pngBlob = blob;
        if (blob.type !== 'image/png') {
            pngBlob = await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
                };
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = src;
            });
        }

        // 构建 ClipboardItem：图片 + 文字
        const items = { 'image/png': pngBlob };
        if (textContent) {
            items['text/plain'] = new Blob([textContent], { type: 'text/plain' });
        }

        await navigator.clipboard.write([new ClipboardItem(items)]);
        return true;
    } catch (err) {
        console.error('Failed to copy image via Clipboard API:', err);

        // 降级方案：使用 document.execCommand('copy') 选中 HTML 内容
        // 这通常能解决跨域图片无法通过 JS 读取数据的问题，交给浏览器处理
        try {
            const div = document.createElement('div');
            div.contentEditable = 'true';
            div.style.position = 'fixed';
            div.style.left = '-9999px';
            div.style.top = '0';
            div.style.whiteSpace = 'pre-wrap'; // 保持换行

            // 插入图片
            const img = document.createElement('img');
            img.src = src;
            div.appendChild(img);

            // 插入文字
            if (textContent) {
                //换行
                div.appendChild(document.createElement('br'));
                const textNode = document.createTextNode(textContent);
                div.appendChild(textNode);
            }

            document.body.appendChild(div);

            // 选中
            const range = document.createRange();
            range.selectNodeContents(div);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            // 执行复制
            const success = document.execCommand('copy');

            // 清理
            document.body.removeChild(div);
            selection.removeAllRanges();

            if (success) return 'html-fallback';
        } catch (e) {
            console.error('Fallback copy failed:', e);
        }

        // 最后的回退：尝试只复制文字
        if (textContent) {
            try {
                await navigator.clipboard.writeText(textContent);
                return 'text-only';
            } catch { /* ignore */ }
        }
        return false;
    }
};

// 灵感图片组件（支持点击放大、右键复制、一键复制）
const InspirationImage = ({ src, textContent = '' }) => {
    const [isZoomed, setIsZoomed] = React.useState(false);
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);
    const [copyStatus, setCopyStatus] = React.useState(null); // null | 'success' | 'text-only' | 'error'

    // ESC 键关闭
    React.useEffect(() => {
        if (!isZoomed) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsZoomed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        // 禁止背景滚动
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isZoomed]);

    // 一键复制图片+文字
    const handleCopyImage = async (e) => {
        e.stopPropagation();
        setCopyStatus(null);
        const result = await copyImageToClipboard(src, textContent);
        if (result === true || result === 'html-fallback') {
            setCopyStatus('success');
        } else if (result === 'text-only') {
            setCopyStatus('text-only');
        } else {
            setCopyStatus('error');
        }
        setTimeout(() => setCopyStatus(null), 2000);
    };

    if (hasError) return null;

    // 复制状态提示文字
    const getCopyStatusText = () => {
        switch (copyStatus) {
            case 'success': return '✓ 已复制图片';
            case 'text-only': return '✓ 已复制文字（图片跨域受限）';
            case 'error': return '✗ 复制失败';
            default: return null;
        }
    };

    // Modal 内容 - 使用 Portal 渲染到 body
    const modal = isZoomed ? createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
            onClick={() => setIsZoomed(false)}
        >
            {/* 图片容器 - 允许右键菜单 */}
            <div
                className="relative max-w-[90vw] max-h-[85vh] animate-in zoom-in-95 fade-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={src}
                    alt=""
                    className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-auto"
                    style={{ margin: 'auto' }}
                    draggable="false"
                />
            </div>

            {/* 关闭按钮 */}
            <button
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all duration-200 backdrop-blur-sm"
                onClick={() => setIsZoomed(false)}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>

            {/* 底部操作栏 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                {/* 复制图片按钮 */}
                <button
                    onClick={handleCopyImage}
                    className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-full text-white text-sm font-medium transition-all duration-200 border border-white/10 hover:border-white/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
                    </svg>
                    {textContent ? '复制图片+文字' : '复制图片'}
                </button>

                {/* 复制状态提示 */}
                {copyStatus && (
                    <span className={`text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm ${copyStatus === 'error'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-green-500/20 text-green-300'
                        }`}>
                        {getCopyStatusText()}
                    </span>
                )}

                {/* 分隔 */}
                {!copyStatus && (
                    <span className="text-white/30 text-sm">
                        右键图片也可复制 · ESC 关闭
                    </span>
                )}
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <>
            {/* 缩略图 */}
            <div
                className={`
                    relative rounded-lg overflow-hidden cursor-zoom-in
                    transition-all duration-300
                    ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    hover:ring-2 hover:ring-pink-300 dark:hover:ring-pink-600
                    hover:shadow-lg hover:scale-[1.02]
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsZoomed(true);
                }}
            >
                <img
                    src={src}
                    alt=""
                    className="max-h-48 max-w-full object-cover rounded-lg"
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                    loading="lazy"
                />
                {!isLoaded && (
                    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg w-32 h-32" />
                )}
            </div>

            {/* Portal Modal */}
            {modal}
        </>
    );
};
