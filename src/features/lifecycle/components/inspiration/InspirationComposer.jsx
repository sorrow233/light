import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Hash } from 'lucide-react';
import { useTranslation } from '../../../i18n';
import { useTheme } from '../../../../hooks/ThemeContext';
import Spotlight from '../../../../components/shared/Spotlight';
import RichTextInput from './RichTextInput';
import ImageUploader from './ImageUploader';
import { COLOR_CONFIG } from './InspirationUtils';

const InspirationComposer = ({ allProjectTags = [], onSubmit }) => {
    const { t } = useTranslation();
    const { isDark } = useTheme();
    const [input, setInput] = useState('');
    const [selectedColorIndex, setSelectedColorIndex] = useState(null);
    const editorRef = useRef(null);
    const imageUploaderRef = useRef(null);

    useEffect(() => {
        const handlePaste = async (e) => {
            const hasImage = Array.from(e.clipboardData?.items || []).some(
                (item) => item.type.startsWith('image/')
            );

            if (hasImage && imageUploaderRef.current) {
                e.preventDefault();
                await imageUploaderRef.current.uploadFromClipboard(e.clipboardData);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const handleColorClick = useCallback((index) => {
        const colorConfig = COLOR_CONFIG[index];

        if (editorRef.current) {
            const applied = editorRef.current.applyColor(colorConfig.id);
            if (!applied) {
                setSelectedColorIndex((prev) => (prev === index ? null : index));
            }
        }
    }, []);

    const handleSubmit = useCallback(async () => {
        const normalizedInput = input.trim();
        if (!normalizedInput) return false;

        const result = await onSubmit?.({
            content: normalizedInput,
            selectedColorIndex,
        });

        if (result === false) return false;

        setInput('');
        editorRef.current?.clear();
        return true;
    }, [input, onSubmit, selectedColorIndex]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void handleSubmit();
        }
    }, [handleSubmit]);

    const handleTagClick = useCallback((projectTitle) => {
        const tag = `[${projectTitle}] `;
        setInput((prev) => prev + tag);
        editorRef.current?.focus();
    }, []);

    const handleImageUploadComplete = useCallback((imageUrl) => {
        setInput((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${imageUrl}` : imageUrl;
        });
    }, []);

    return (
        <div className="relative mb-20 group z-30">
            <Spotlight className="rounded-2xl accent-focus-shell" spotColor="var(--accent-spotlight)">
                <div className="absolute -inset-1 bg-gradient-to-r from-gray-100 dark:from-gray-800 via-gray-50 dark:via-gray-900 to-gray-100 dark:to-gray-800 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_20px_-4px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-800 overflow-visible transition-all duration-300 group-hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.08)] dark:group-hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.4)] group-hover:border-gray-200 dark:group-hover:border-gray-700">
                    <RichTextInput
                        ref={editorRef}
                        value={input}
                        onChange={setInput}
                        onKeyDown={handleKeyDown}
                        placeholder={t('inspiration.placeholder')}
                        className="w-full bg-transparent text-lg text-gray-800 dark:text-gray-100 outline-none p-6 pb-20 min-h-[200px] font-light leading-relaxed relative z-10 break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400/50"
                        style={{
                            fontFamily: 'inherit',
                            lineHeight: '1.625',
                            letterSpacing: 'normal',
                            fontVariantLigatures: 'none',
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            caretColor: 'var(--accent-500)',
                        }}
                    />

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 z-20">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50/50 dark:bg-gray-800/50 rounded-full border border-gray-100/50 dark:border-gray-700/50 backdrop-blur-sm flex-shrink-0">
                                {COLOR_CONFIG.map((conf, index) => (
                                    <button
                                        key={conf.id}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleColorClick(index)}
                                        className={`relative w-3 h-3 rounded-full transition-all duration-300 ${conf.dot} ${index === selectedColorIndex ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 ring-gray-400 dark:ring-gray-500 scale-110' : 'opacity-40 hover:opacity-100 hover:scale-110'} after:absolute after:-inset-2`}
                                        title={conf.id}
                                    />
                                ))}
                            </div>

                            <ImageUploader
                                ref={imageUploaderRef}
                                onUploadComplete={handleImageUploadComplete}
                            />

                            <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-2 mask-linear-fade">
                                {allProjectTags.length > 0 && (
                                    <>
                                        <Hash size={14} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                        {allProjectTags.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => handleTagClick(tag)}
                                                className="flex-shrink-0 px-2 py-1 accent-chip rounded-md text-[11px] font-medium transition-all duration-300 whitespace-nowrap"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono hidden md:inline-block">
                                {t('inspiration.cmdEnter')}
                            </span>
                            <button
                                onClick={() => void handleSubmit()}
                                disabled={!input.trim()}
                                className="flex items-center justify-center p-3 accent-button rounded-xl disabled:opacity-30 transition-all duration-300 active:scale-95"
                                style={isDark ? { boxShadow: '0 12px 24px -18px rgba(15, 23, 42, 0.5)' } : undefined}
                            >
                                <ArrowRight size={18} strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </div>
            </Spotlight>
        </div>
    );
};

export default memo(InspirationComposer);
