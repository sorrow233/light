import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n';
import { useSync } from '../sync/SyncContext';
import { useSyncedCategories, useSyncedProjects } from '../sync/useSyncStore';
import InspirationItem from './components/inspiration/InspirationItem';
import { INSPIRATION_CATEGORIES } from '../../utils/constants';
import { usePageTitle } from '../../hooks/usePageTitle';

const InspirationArchiveModule = () => {
    const { t } = useTranslation();
    usePageTitle(t('inspiration.archiveTitle', '灵感存档'));
    const navigate = useNavigate();
    const { doc, immediateSync } = useSync();
    const { projects: allIdeas, updateProject, removeProject } = useSyncedProjects(doc, 'inspiration_items');
    const { categories: syncedCategories } = useSyncedCategories(
        doc,
        'inspiration_categories',
        INSPIRATION_CATEGORIES,
        { initializeDefaults: false, cleanupDuplicates: true }
    );
    const categories = useMemo(() => {
        const baseCategories = syncedCategories.length > 0 ? syncedCategories : INSPIRATION_CATEGORIES;
        const uniqueMap = new Map();

        baseCategories.forEach((cat) => {
            if (!cat?.id || uniqueMap.has(cat.id)) return;
            uniqueMap.set(cat.id, cat);
        });

        return Array.from(uniqueMap.values()).map((cat) => {
            const defaultCat = INSPIRATION_CATEGORIES.find((item) => item.id === cat.id);
            if (!defaultCat) return cat;
            return {
                ...defaultCat,
                ...cat,
                textColor: cat.textColor || defaultCat.textColor,
                dotColor: cat.dotColor || defaultCat.dotColor,
                color: cat.color || defaultCat.color,
            };
        });
    }, [syncedCategories]);

    const archivedIdeas = useMemo(() =>
        allIdeas
            .filter((idea) => idea.stage === 'archive')
            .sort((left, right) => (right.archiveTimestamp || 0) - (left.archiveTimestamp || 0)),
        [allIdeas]);

    const handleRestore = (id) => {
        updateProject(id, { stage: 'inspiration' });
        immediateSync?.();
    };

    const handleDelete = (id) => {
        removeProject(id);
        immediateSync?.();
    };

    const handleCopy = async (content) => {
        try {
            await navigator.clipboard.writeText(content);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        }
    };

    return (
        <div className="max-w-4xl mx-auto pt-14 px-6 md:px-10 pb-32">
            {/* Header */}
            <div className="mb-14">
                <div className="flex items-center gap-4 mb-3">
                    <button
                        onClick={() => navigate('/inspiration')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
                            <Archive className="w-5 h-5 text-pink-400" />
                        </div>
                        <h2
                            onClick={() => navigate('/inspiration')}
                            className="text-3xl font-light text-pink-400 dark:text-pink-300 tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            {t('inspiration.archiveTitle', '灵感存档')}
                        </h2>
                    </div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-base font-light tracking-wide ml-14">
                    {t('inspiration.archiveSubtitle', '暂存的灵感碎片，点击标题返回')}
                </p>
            </div>

            {/* Archive List */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {archivedIdeas.length > 0 ? (
                        archivedIdeas.map((idea) => (
                            <InspirationItem
                                key={idea.id}
                                idea={idea}
                                categories={categories}
                                onRemove={handleDelete}
                                onArchive={handleRestore} // Right swipe restores in archive view
                                onCopy={handleCopy}
                                onToggleComplete={(id, completed) => {
                                    updateProject(id, { completed });
                                    immediateSync?.();
                                }}
                                onUpdateNote={(id, note) => {
                                    updateProject(id, { note });
                                    immediateSync?.();
                                }}
                                onUpdateContent={(id, content) => {
                                    updateProject(id, { content });
                                    immediateSync?.();
                                }}
                                onUpdateColor={(id, colorIndex) => {
                                    updateProject(id, { colorIndex });
                                    immediateSync?.();
                                }}
                                isArchiveView={true}
                            />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-32 text-center"
                        >
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Archive className="text-gray-300 dark:text-gray-600" size={24} />
                            </div>
                            <p className="text-gray-400 dark:text-gray-500 text-sm font-light tracking-wide">
                                {t('inspiration.emptyArchive', '存档箱是空的')}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default InspirationArchiveModule;
