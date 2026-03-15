import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    Lightbulb,
    Archive,
    Sparkles,
    FolderTree,
    CheckCheck,
    CalendarDays
} from 'lucide-react';
import { useSync } from '../sync/SyncContext';
import { useSyncedCategories, useSyncedProjects } from '../sync/useSyncStore';
import { useTranslation } from '../i18n';
import Spotlight from '../../components/shared/Spotlight';
import DataChartModal from './components/DataChartModal';
import { useDataCenterStats, useChartData } from './hooks/useDataCenterData';
import { INSPIRATION_CATEGORIES } from '../../utils/constants';
import { usePageTitle } from '../../hooks/usePageTitle';

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

    const stats = useDataCenterStats(allIdeas, categories);
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
                    <motion.div variants={cardVariants}>
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-5 text-center hover:border-pink-200 dark:hover:border-pink-800/50 transition-all duration-300 hover:shadow-sm">
                            <div className="mx-auto mb-3 w-10 h-10 flex items-center justify-center bg-pink-50 dark:bg-pink-900/20 rounded-xl">
                                <Lightbulb className="w-4 h-4 text-pink-400" />
                            </div>
                            <div className="text-2xl md:text-3xl font-light text-pink-500 dark:text-pink-400 mb-1">
                                {stats.totalIdeas}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-light uppercase tracking-wider">
                                {t('navbar.inspiration')}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={cardVariants}>
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-5 text-center hover:border-purple-200 dark:hover:border-purple-800/50 transition-all duration-300 hover:shadow-sm">
                            <div className="mx-auto mb-3 w-10 h-10 flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                <FolderTree className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="text-2xl md:text-3xl font-light text-purple-500 dark:text-purple-400 mb-1">
                                {stats.categoryCount}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-light uppercase tracking-wider">
                                {t('data.growingCount', '分类数')}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={cardVariants}>
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-5 text-center hover:border-sky-200 dark:hover:border-sky-800/50 transition-all duration-300 hover:shadow-sm">
                            <div className="mx-auto mb-3 w-10 h-10 flex items-center justify-center bg-sky-50 dark:bg-sky-900/20 rounded-xl">
                                <CalendarDays className="w-4 h-4 text-sky-400" />
                            </div>
                            <div className="text-2xl md:text-3xl font-light text-sky-500 dark:text-sky-400 mb-1">
                                {stats.thisWeekIdeas}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-light uppercase tracking-wider">
                                {t('data.blueprintCount', '本周新增')}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={cardVariants}>
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-5 text-center hover:border-blue-200 dark:hover:border-blue-800/50 transition-all duration-300 hover:shadow-sm">
                            <div className="mx-auto mb-3 w-10 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <CheckCheck className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-2xl md:text-3xl font-light text-blue-500 dark:text-blue-400 mb-1">
                                {stats.completedTodoCount}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-light uppercase tracking-wider">
                                {t('navbar.writing', '已完成待办')}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={cardVariants}>
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-5 text-center hover:border-amber-200 dark:hover:border-amber-800/50 transition-all duration-300 hover:shadow-sm">
                            <div className="mx-auto mb-3 w-10 h-10 flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                <Archive className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="text-2xl md:text-3xl font-light text-amber-500 dark:text-amber-400 mb-1">
                                {stats.archivedIdeas}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-light uppercase tracking-wider">
                                {t('data.archivedIdeas', '归档条目')}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div variants={cardVariants}>
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-5 text-center hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all duration-300 hover:shadow-sm">
                            <div className="mx-auto mb-3 w-10 h-10 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                <Sparkles className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl md:text-3xl font-light text-emerald-500 dark:text-emerald-400 mb-1">
                                {stats.todayIdeas}
                            </div>
                            <div className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 font-light uppercase tracking-wider">
                                {t('data.today', '今日新增')}
                            </div>
                        </div>
                    </motion.div>
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
