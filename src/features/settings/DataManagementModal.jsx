import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, FileJson, AlertCircle, CheckCircle2, Loader2, History, RotateCcw, Clock, ChevronLeft } from 'lucide-react';
import { useSync } from '../sync/SyncContext';
import { exportAllData, importData, validateImportData, downloadAsJson, readJsonFile } from './dataUtils';
import { getLocalBackups } from '../sync/LocalBackupService';
import UploadAccessPanel from './components/UploadAccessPanel';
import Spotlight from '../../components/shared/Spotlight';

const DataManagementModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState('menu'); // 'menu' | 'importing' | 'preview' | 'settings' | 'backups'
    const [importFile, setImportFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [backups, setBackups] = useState([]);

    const fileInputRef = useRef(null);

    const { doc } = useSync();

    // 加载备份列表
    useEffect(() => {
        if (mode === 'backups') {
            const list = getLocalBackups().sort((a, b) => b.timestamp - a.timestamp);
            setBackups(list);
        }
    }, [mode]);

    const resetState = () => {
        setMode('menu');
        setImportFile(null);
        setPreviewData(null);
        setError('');
        setSuccess('');
        setLoading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handlePanelError = useCallback((message) => {
        setSuccess('');
        setError(message);
    }, []);

    const handlePanelSuccess = useCallback((message) => {
        setError('');
        setSuccess(message);
        setTimeout(() => setSuccess(''), 3000);
    }, []);

    // 导出处理
    const handleExport = () => {
        try {
            setLoading(true);
            const data = exportAllData(doc);
            const timestamp = new Date().toISOString().split('T')[0];
            downloadAsJson(data, `light-backup-${timestamp}.json`);
            setSuccess('数据已成功导出！');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(`导出失败: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 加载备份进行预览（恢复流程）
    const handleRestoreBackup = (backup) => {
        try {
            const validation = validateImportData(backup.data);
            if (!validation.valid) {
                setError('备份数据验证失败: ' + validation.errors.join('\n'));
                return;
            }

            setImportFile({ name: `自动备份 (${new Date(backup.timestamp).toLocaleString()})` });
            setPreviewData(backup.data);
            setImportMode('replace'); // 恢复备份默认使用覆盖模式
            setMode('preview');
        } catch (e) {
            setError('加载备份失败: ' + e.message);
        }
    };

    // 下载单个备份
    const handleDownloadBackup = (backup) => {
        const dateStr = new Date(backup.timestamp).toISOString().replace(/[:.]/g, '-');
        downloadAsJson(backup.data, `light-auto-backup-${dateStr}.json`);
    };

    // 文件选择处理
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setLoading(true);

        try {
            const data = await readJsonFile(file);
            const validation = validateImportData(data);

            if (!validation.valid) {
                setError(validation.errors.join('\n'));
                setLoading(false);
                return;
            }

            setImportFile(file);
            setPreviewData(data);
            setMode('preview');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // 拖拽处理
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files?.[0];
        if (file && file.type === 'application/json') {
            // 模拟 fileInput 的 change 事件
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            if (fileInputRef.current) {
                fileInputRef.current.files = dataTransfer.files;
                handleFileSelect({ target: { files: dataTransfer.files } });
            }
        } else {
            setError('请上传 JSON 文件');
        }
    };

    // 执行导入
    const executeImport = () => {
        if (!previewData) return;

        setLoading(true);
        try {
            importData(doc, previewData, importMode);
            setSuccess('数据导入成功！页面将刷新以应用更改。');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err) {
            setError(`导入失败: ${err.message}`);
            setLoading(false);
        }
    };

    // 统计摘要
    const getDataSummary = useCallback(() => {
        if (!previewData?.data) return null;
        const {
            inspirationItems,
            inspirationCategories,
            userPreferences,
        } = previewData.data;

        const allIdeas = Array.isArray(inspirationItems) ? inspirationItems : [];
        const archived = allIdeas.filter((idea) => idea?.stage === 'archive').length;

        return {
            ideas: allIdeas.length,
            archived,
            categories: Array.isArray(inspirationCategories) ? inspirationCategories.length : 0,
            preferences: userPreferences && typeof userPreferences === 'object'
                ? Object.keys(userPreferences).length
                : 0,
        };
    }, [previewData]);

    // 渲染备份项摘要
    const getBackupSummary = (backupData) => {
        const innerData = backupData?.data?.data || {};
        const { inspirationItems, inspirationCategories } = innerData;
        const count = (inspirationItems?.length || 0) + (inspirationCategories?.length || 0);
        return `${count} ${t('advanced.items')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md"
                onClick={handleClose}
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col ring-1 ring-gray-100 dark:ring-gray-800"
            >
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-light text-gray-900 dark:text-white flex items-center gap-3">
                                {mode !== 'menu' && (
                                    <button
                                        onClick={() => setMode('menu')}
                                        className="hover:bg-gray-100 p-1 rounded-lg -ml-2 mr-1 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                )}
                                {mode === 'menu' && '设置'}
                                {mode === 'preview' && '导入预览'}
                                {mode === 'backups' && '本地备份历史'}
                            </h2>
                            <p className="text-sm text-gray-400 mt-1.5 tracking-wide">
                                {mode === 'menu' && '管理灵感、分类与同步设置'}
                                {mode === 'preview' && '确认导入以下灵感数据'}
                                {mode === 'backups' && '每小时自动备份，最多保留3天'}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-2">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span className="whitespace-pre-wrap">{error}</span>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-xl border border-emerald-100 flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            {success}
                        </div>
                    )}

                    {/* Main Menu */}
                    {mode === 'menu' && (
                        <div className="space-y-4">
                            <UploadAccessPanel
                                doc={doc}
                                onError={handlePanelError}
                                onSuccess={handlePanelSuccess}
                            />

                            {/* Local Backups Button */}
                            <Spotlight className="rounded-2xl" spotColor="rgba(147, 51, 234, 0.1)">
                                <button
                                    onClick={() => setMode('backups')}
                                    className="w-full p-5 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-2xl transition-all flex items-center gap-5 group border border-gray-100 dark:border-gray-800"
                                >
                                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                        <History size={22} className="text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <div className="font-medium text-gray-900 dark:text-white">本地备份</div>
                                        <div className="text-xs text-gray-400 mt-0.5">查看和恢复自动备份</div>
                                    </div>
                                </button>
                            </Spotlight>

                            {/* Export Button */}
                            <Spotlight className="rounded-2xl" spotColor="rgba(16, 185, 129, 0.1)">
                                <button
                                    onClick={handleExport}
                                    disabled={loading}
                                    className="w-full p-5 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-2xl transition-all flex items-center gap-5 group border border-gray-100 dark:border-gray-800"
                                >
                                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                            <Download size={22} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 dark:text-white">导出数据</div>
                                            <div className="text-xs text-gray-400 mt-0.5">下载灵感、分类和设置</div>
                                        </div>
                                    </button>
                                </Spotlight>

                            {/* Import Area */}
                            <Spotlight className="rounded-2xl" spotColor="rgba(59, 130, 246, 0.1)">
                                <div
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full p-8 border-2 border-dashed border-gray-100 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl transition-all cursor-pointer flex flex-col items-center gap-4 group bg-gray-50/30 dark:bg-gray-800/10"
                                >
                                    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Upload size={26} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-gray-900 dark:text-white">导入数据</div>
                                        <div className="text-xs text-gray-400 mt-1">拖拽或点击选择 JSON 文件</div>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json,application/json"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>
                            </Spotlight>
                        </div>
                    )}

                    {/* Backups List */}
                    {mode === 'backups' && (
                        <div className="space-y-4">
                            {backups.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <History size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-sm font-light">暂无本地备份</p>
                                    <p className="text-[10px] mt-2 tracking-wide">系统会在您在线时每小时自动备份</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {backups.map((backup, index) => (
                                        <div key={backup.timestamp} className="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl flex items-center justify-between group hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all border border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shadow-sm text-gray-400 dark:text-gray-500 ring-1 ring-gray-100 dark:ring-gray-800">
                                                    <Clock size={18} />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {new Date(backup.timestamp).toLocaleString()}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 mt-0.5 tracking-wider uppercase font-bold">
                                                        {getBackupSummary(backup)} · {Math.round(JSON.stringify(backup.data).length / 1024)} KB
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleRestoreBackup(backup)}
                                                    className="p-2 bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors ring-1 ring-gray-100 dark:ring-gray-800"
                                                    title="恢复此备份"
                                                >
                                                    <RotateCcw size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadBackup(backup)}
                                                    className="p-2 bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors ring-1 ring-gray-100 dark:ring-gray-800"
                                                    title="下载 JSON"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
                                <button
                                    onClick={() => setMode('menu')}
                                    className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                                >
                                    返回主菜单
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Import Preview */}
                    {mode === 'preview' && previewData && (
                        <div className="space-y-6">
                            {/* File Info */}
                            <div className="p-5 bg-gray-50/50 dark:bg-gray-800/30 rounded-[1.5rem] flex items-center gap-4 border border-gray-100 dark:border-gray-800">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                    <FileJson size={24} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">{importFile?.name}</div>
                                    <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">
                                        导出于 {new Date(previewData.exportedAt).toLocaleString('zh-CN')}
                                    </div>
                                </div>
                            </div>

                            {/* Data Summary */}
                            {(() => {
                                const summary = getDataSummary();
                                if (!summary) return null;
                                return (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl text-center border border-amber-100/50 dark:border-amber-900/20">
                                            <div className="text-2xl font-light text-amber-600 dark:text-amber-400">{summary.ideas}</div>
                                            <div className="text-[10px] text-amber-500/80 uppercase tracking-widest font-bold mt-1">灵感条目</div>
                                        </div>
                                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl text-center border border-emerald-100/50 dark:border-emerald-900/20">
                                            <div className="text-2xl font-light text-emerald-600 dark:text-emerald-400">{summary.archived}</div>
                                            <div className="text-[10px] text-emerald-500/80 uppercase tracking-widest font-bold mt-1">归档条目</div>
                                        </div>
                                        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl text-center border border-blue-100/50 dark:border-blue-900/20">
                                            <div className="text-2xl font-light text-blue-600 dark:text-blue-400">{summary.categories}</div>
                                            <div className="text-[10px] text-blue-500/80 uppercase tracking-widest font-bold mt-1">分类</div>
                                        </div>
                                        <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl text-center border border-purple-100/50 dark:border-purple-900/20">
                                            <div className="text-2xl font-light text-purple-600 dark:text-purple-400">{summary.preferences}</div>
                                            <div className="text-[10px] text-purple-500/80 uppercase tracking-widest font-bold mt-1">设置项</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Import Mode Selection */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">导入模式</label>
                                <div className="flex gap-2 p-1 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    <button
                                        onClick={() => setImportMode('merge')}
                                        className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium transition-all ${importMode === 'merge'
                                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-100 dark:ring-gray-600'
                                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        合并
                                    </button>
                                    <button
                                        onClick={() => setImportMode('replace')}
                                        className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium transition-all ${importMode === 'replace'
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-red-900/20'
                                            : 'text-gray-400 hover:text-red-400 dark:hover:text-red-400'
                                            }`}
                                    >
                                        覆盖
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 px-1 italic">
                                    {importMode === 'merge' ? '在现有数据基础上追加导入项' : '清空当前所有数据并替换为备份内容'}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={resetState}
                                    className="flex-1 py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={executeImport}
                                    disabled={loading}
                                    className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-xl"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            导入中...
                                        </>
                                    ) : (
                                        '确认导入'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DataManagementModal;
