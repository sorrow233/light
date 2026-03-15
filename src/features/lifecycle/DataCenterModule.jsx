import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Sparkles,
} from 'lucide-react';
import { useSync } from '../sync/SyncContext';
import { useSyncedCategories, useSyncedProjects } from '../sync/useSyncStore';
import { useTranslation } from '../i18n';
import Spotlight from '../../components/shared/Spotlight';
import DataChartModal from './components/DataChartModal';
import { useDataCenterStats, useChartData } from './hooks/useDataCenterData';
import { INSPIRATION_CATEGORIES } from '../../utils/constants';
import { usePageTitle } from '../../hooks/usePageTitle';
import { hexToRgba, resolveCategoryAccentHex } from './components/inspiration/categoryThemeUtils';

const DataCenterModule = () => {
    const { doc } = useSync();
    const { t } = useTranslation();
    usePageTitle(t('navbar.data'));
    const [showChart, setShowChart] = useState(false);

    const { projects: allIdeas } = useSyncedProjects(doc, 'inspiration_items');
    const { categories } = useSyncedCategories(
        doc,
        'inspiration_categories',
        INSPIRATION_CATEGORIES,
        { initializeDefaults: false, cleanupDuplicates: true }
    );

    const categoryConfigList = useMemo(() => {
        const baseCategories = categories.length > 0 ? categories : INSPIRATION_CATEGORIES;
        const uniqueMap = new Map();

        baseCategories.forEach((category) => {
            if (!category?.id || uniqueMap.has(category.id)) return;
            uniqueMap.set(category.id, category);
        });

        return Array.from(uniqueMap.values()).map((category) => {
            const defaultCategory = INSPIRATION_CATEGORIES.find((item) => item.id === category.id);
            if (!defaultCategory) return category;

            return {
                ...defaultCategory,
                ...category,
                textColor: category.textColor || defaultCategory.textColor,
                dotColor: category.dotColor || defaultCategory.dotColor,
                color: category.color || defaultCategory.color,
            };
        });
    }, [categories]);

    const stats = useDataCenterStats(allIdeas, categoryConfigList);
    const chartData = useChartData(allIdeas);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
    };

    return (
        <div className="max-w-4xl mx-auto pt-14 px-6 md:px-10 pb-32">
            <div className="mb-14 text-center md:text-left">
                <div className="inline-flex items-center justify-center md:justify-start gap-2 mb-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-light text-indigo-400 dark:text-indigo-300 tracking-tight relative inline-block">
                        {t('navbar.data')}
                        {/* Indigo Brush Stroke */}
                        <span className="absolute -bottom-1 left-0 w-full h-2 bg-gradient-to-r from-indigo-200/80 via-indigo-300/60 to-transparent dark:from-indigo-700/50 dark:via-indigo-600/30 dark:to-transparent rounded-full blur-[2px]" />
                    </h2>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-base font-light tracking-wide max-w-md mx-auto md:mx-0 leading-relaxed">
                    {t('data.subtitle', '只统计当前独立项目中的灵感、分类与归档数据。')}
                </p>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-4"
            >
                <motion.div variants={cardVariants}>
                    <Spotlight
                        className="rounded-2xl transition-all duration-500 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/10 hover:scale-[1.01] active:scale-[0.99] group/card"
                        spotColor="rgba(99, 102, 241, 0.08)"
                    >
                        <div
                            className="p-6 md:p-8 cursor-pointer select-none"
                            onDoubleClick={() => setShowChart(true)}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/30 dark:to-indigo-800/20 rounded-xl group-hover/card:scale-110 transition-transform duration-500">
                                        <Sparkles className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <span className="text-sm text-gray-400 dark:text-gray-500 font-light uppercase tracking-widest">
                                        {t('data.totalWords', '灵感字数')}
                                    </span>
                                </div>
                                <div className="text-[10px] text-indigo-300 dark:text-indigo-700 font-light hidden md:block italic opacity-0 group-hover/card:opacity-100 transition-opacity duration-500">
                                    {t('data.chartDetailHint', '双击查看近期开启节奏')}
                                </div>
                            </div>
                            <div className="text-5xl md:text-7xl font-extralight text-indigo-500 dark:text-indigo-400 tracking-tighter mb-6">
                                {stats.totalChars.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-8 text-xs font-light text-gray-400 dark:text-gray-500">
                                <div className="flex flex-col gap-1.5">
                                    <span className="uppercase tracking-widest text-[9px] opacity-70">{t('data.today')}</span>
                                    <span className="text-indigo-400 font-medium text-sm">{stats.todayChars.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="uppercase tracking-widest text-[9px] opacity-70">{t('data.thisWeek')}</span>
                                    <span className="text-indigo-400 font-medium text-sm">{stats.thisWeekChars.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </Spotlight>
                </motion.div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                    {stats.categoryBreakdown.map((categoryStat) => {
                        const accentHex = resolveCategoryAccentHex(categoryStat);

                        return (
                            <motion.div key={categoryStat.id} variants={cardVariants}>
                                <div
                                    className="rounded-2xl border bg-white p-4 text-center transition-all duration-300 hover:shadow-sm dark:bg-gray-900 dark:border-gray-800"
                                    style={{
                                        borderColor: hexToRgba(accentHex, 0.18),
                                        boxShadow: `0 18px 34px -32px ${hexToRgba(accentHex, 0.36)}`,
                                    }}
                                >
                                    <div
                                        className="mx-auto mb-3 inline-flex h-14 min-w-[3.5rem] items-center justify-center rounded-2xl px-3 text-2xl font-light tracking-tight md:text-3xl"
                                        style={{
                                            backgroundColor: hexToRgba(accentHex, 0.12),
                                            color: accentHex,
                                        }}
                                    >
                                        {categoryStat.count}
                                    </div>
                                    <div className="text-[11px] font-medium text-gray-700 dark:text-gray-200">
                                        {categoryStat.label}
                                    </div>
                                    <div className="mt-1 text-[10px] font-light uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        {t('data.categoryShare', '占全部')} {categoryStat.share}%
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            <DataChartModal
                isOpen={showChart}
                onClose={() => setShowChart(false)}
                data={chartData}
            />

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-16 text-center"
            >
                <p className="text-xs text-gray-300 dark:text-gray-700 font-light italic">
                    "Data keeps only what your inspiration truly left behind."
                </p>
            </motion.div>
        </div>
    );
};

export default DataCenterModule;
