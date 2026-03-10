import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Check, Edit2, Sparkles } from 'lucide-react';
import { MAX_INSPIRATION_CATEGORIES } from './categoryManagerConstants';

const COLOR_PRESETS = [
    { id: 'pink', color: 'bg-pink-400', dotColor: 'bg-pink-400', textColor: 'text-pink-400' },
    { id: 'blue', color: 'bg-blue-400', dotColor: 'bg-blue-400', textColor: 'text-blue-400' },
    { id: 'violet', color: 'bg-violet-400', dotColor: 'bg-violet-400', textColor: 'text-violet-400' },
    { id: 'emerald', color: 'bg-emerald-400', dotColor: 'bg-emerald-400', textColor: 'text-emerald-400' },
    { id: 'amber', color: 'bg-amber-400', dotColor: 'bg-amber-400', textColor: 'text-amber-400' },
    { id: 'rose', color: 'bg-rose-400', dotColor: 'bg-rose-400', textColor: 'text-rose-400' },
    { id: 'cyan', color: 'bg-cyan-400', dotColor: 'bg-cyan-400', textColor: 'text-cyan-400' },
    { id: 'orange', color: 'bg-orange-400', dotColor: 'bg-orange-400', textColor: 'text-orange-400' },
    { id: 'teal', color: 'bg-teal-400', dotColor: 'bg-teal-400', textColor: 'text-teal-400' },
    { id: 'indigo', color: 'bg-indigo-400', dotColor: 'bg-indigo-400', textColor: 'text-indigo-400' },
];

const CategoryManager = ({ isOpen, onClose, categories, onAdd, onUpdate, onRemove, onOpenAiCategoryTransfer }) => {
    const [editingId, setEditingId] = useState(null);
    const [editLabel, setEditLabel] = useState('');
    const [editColor, setEditColor] = useState(COLOR_PRESETS[0]);

    // Add new category state
    const [isAdding, setIsAdding] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    // Random default color to avoid repetitive pink
    const [newColor, setNewColor] = useState(() => COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);

    // Delete confirmation state
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    // Maximum categories limit
    const MAX_CATEGORIES = MAX_INSPIRATION_CATEGORIES;

    // Get colors already in use (excluding the one being edited)
    const usedColors = categories
        .filter(c => c.id !== editingId)
        .map(c => c.color);

    // Available colors for new/editing category
    const availableColors = COLOR_PRESETS.filter(p => !usedColors.includes(p.color));

    const startEdit = (cat) => {
        setEditingId(cat.id);
        setEditLabel(cat.label);
        // Find matching preset based on color class, fallback to first
        const preset = COLOR_PRESETS.find(p => p.color === cat.color) || COLOR_PRESETS[0];
        setEditColor(preset);
    };

    const saveEdit = () => {
        if (editLabel.trim()) {
            onUpdate(editingId, {
                label: editLabel.trim(),
                ...editColor
            });
        }
        setEditingId(null);
    };

    const handleAdd = () => {
        if (newLabel.trim() && categories.length < MAX_CATEGORIES) {
            onAdd({
                label: newLabel.trim(),
                ...newColor
            });
            setNewLabel('');
            // Pick a random color from remaining available colors
            const remainingColors = COLOR_PRESETS.filter(p =>
                !categories.map(c => c.color).includes(p.color) && p.id !== newColor.id
            );
            setNewColor(remainingColors.length > 0
                ? remainingColors[Math.floor(Math.random() * remainingColors.length)]
                : COLOR_PRESETS[0]
            );
            setIsAdding(false);
        }
    };

    const handleOpenAiCategoryTransfer = () => {
        onClose?.();
        setTimeout(() => {
            onOpenAiCategoryTransfer?.();
        }, 0);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 p-4 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">管理分类</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleOpenAiCategoryTransfer}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 text-sky-500 dark:text-sky-300 text-xs font-medium hover:bg-sky-100 dark:hover:bg-sky-900/35 transition-colors"
                                    title="按分类导出并导入 AI 分类结果"
                                >
                                    <Sparkles size={12} />
                                    AI一键分类
                                </button>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {categories.map(cat => (
                                <div key={cat.id} className="group flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all">
                                    {editingId === cat.id ? (
                                        // Edit Mode
                                        <div className="flex-1 flex items-center gap-2">
                                            <div className="flex-shrink-0 relative">
                                                <div className={`w-4 h-4 rounded-full ${editColor.dotColor}`} />
                                                <select
                                                    value={COLOR_PRESETS.findIndex(p => p.id === editColor.id)}
                                                    onChange={e => setEditColor(COLOR_PRESETS[e.target.value])}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                >
                                                    {COLOR_PRESETS.map((p, i) => (
                                                        <option key={p.id} value={i}>{p.id}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <input
                                                autoFocus
                                                value={editLabel}
                                                onChange={e => setEditLabel(e.target.value)}
                                                className="flex-1 bg-white dark:bg-gray-900 px-2 py-1 rounded border border-blue-400 outline-none text-sm"
                                            />
                                            <button onClick={saveEdit} className="p-1 text-green-500 hover:bg-green-50 rounded"><Check size={16} /></button>
                                            <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        // View Mode
                                        <>
                                            <div className={`w-3 h-3 rounded-full ${cat.dotColor}`} />
                                            <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>

                                            <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                {deleteConfirmId === cat.id ? (
                                                    <div className="flex items-center animate-in fade-in zoom-in duration-200">
                                                        <span className="text-xs text-red-500 mr-2 font-medium">确定删除?</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onRemove(cat.id);
                                                                setDeleteConfirmId(null);
                                                            }}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded bg-white shadow-sm border border-red-100 mr-1"
                                                            title="确认删除"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteConfirmId(null);
                                                            }}
                                                            className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                                            title="取消"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        {/* Prevent removing the last category */}
                                                        {categories.length > 1 && (
                                                            <button onClick={() => setDeleteConfirmId(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* Add New Section */}
                            {isAdding ? (
                                <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <div className="flex-shrink-0 relative">
                                        <div className={`w-4 h-4 rounded-full ${newColor.dotColor}`} />
                                        <select
                                            value={availableColors.findIndex(p => p.id === newColor.id)}
                                            onChange={e => setNewColor(availableColors[e.target.value])}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        >
                                            {availableColors.map((p, i) => (
                                                <option key={p.id} value={i}>{p.id}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <input
                                        autoFocus
                                        placeholder="分类名称..."
                                        value={newLabel}
                                        onChange={e => setNewLabel(e.target.value)}
                                        className="flex-1 bg-white dark:bg-gray-900 px-2 py-1 rounded border border-blue-400 outline-none text-sm"
                                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                                    />
                                    <button onClick={handleAdd} className="p-1 text-blue-500 hover:bg-blue-100 rounded"><Check size={16} /></button>
                                    <button onClick={() => setIsAdding(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={16} /></button>
                                </div>
                            ) : categories.length < MAX_CATEGORIES ? (
                                <button
                                    onClick={() => {
                                        // Set initial color to first available
                                        if (availableColors.length > 0) {
                                            setNewColor(availableColors[Math.floor(Math.random() * availableColors.length)]);
                                        }
                                        setIsAdding(true);
                                    }}
                                    className="w-full py-3 flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 transition-all font-medium"
                                >
                                    <Plus size={16} />
                                    添加分类
                                </button>
                            ) : (
                                <div className="w-full py-3 text-center text-xs text-gray-400">
                                    已达到最大分类数量 ({MAX_CATEGORIES})
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CategoryManager;
