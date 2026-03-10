import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, TrendingUp, Sparkles } from 'lucide-react';

const DataChartModal = ({ isOpen, onClose, data }) => {
    const [view, setView] = useState('daily'); // daily, weekly, monthly
    const [showInspiration, setShowInspiration] = useState(false);

    const currentData = useMemo(() => {
        if (!data) return [];
        const d = view === 'daily' ? data.daily : view === 'weekly' ? data.weekly : data.monthly;
        return d || [];
    }, [data, view]);

    const hasData = useMemo(() => currentData.some(d => d.value > 0 || d.inspirations > 0), [currentData]);

    // Number formatting helper
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return num.toString();
    };

    const maxWords = useMemo(() => {
        const values = currentData.map(d => d.value);
        return Math.max(...values, 100);
    }, [currentData]);

    const maxInspirations = useMemo(() => {
        const values = currentData.map(d => d.inspirations);
        return Math.max(...values, 10);
    }, [currentData]);

    // Chart Dimensions
    const width = 600;
    const height = 300;
    const paddingX = 40;
    const paddingY = 60;

    // Helper to generate points
    const getPoint = (val, max, index, total) => {
        const x = paddingX + (index / (total - 1)) * (width - paddingX * 2);
        const y = height - paddingY - (val / max) * (height - paddingY * 2);
        return { x, y };
    };

    // Helper to generate Bezier Path
    const getBezierPath = (points, isArea = false) => {
        if (points.length < 2) return '';
        let d = `M ${points[0].x},${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            const cp2x = p0.x + (p1.x - p0.x) / 2;
            d += ` C ${cp1x},${p0.y} ${cp2x},${p1.y} ${p1.x},${p1.y}`;
        }

        if (isArea) {
            d += ` L ${points[points.length - 1].x},${height - paddingY}`;
            d += ` L ${points[0].x},${height - paddingY} Z`;
        }
        return d;
    };

    const wordPoints = useMemo(() => {
        if (currentData.length === 0) return [];
        return currentData.map((d, i) => ({
            ...getPoint(d.value, maxWords, i, currentData.length),
            value: d.value,
            label: d.label
        }));
    }, [currentData, maxWords]);

    const inspirationPoints = useMemo(() => {
        if (currentData.length === 0) return [];
        return currentData.map((d, i) => ({
            ...getPoint(d.inspirations, maxInspirations, i, currentData.length),
            value: d.inspirations,
            label: d.label
        }));
    }, [currentData, maxInspirations]);

    const wordPathLine = useMemo(() => getBezierPath(wordPoints), [wordPoints]);
    const wordPathArea = useMemo(() => getBezierPath(wordPoints, true), [wordPoints]);
    const inspirationPathLine = useMemo(() => getBezierPath(inspirationPoints), [inspirationPoints]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-2xl"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className="relative w-full max-w-4xl bg-white/80 dark:bg-gray-950/90 border border-white/20 dark:border-gray-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden p-8 md:p-12"
                    >
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                    <TrendingUp className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-2xl font-light text-gray-900 dark:text-white tracking-tight">创作心律</h3>
                                        <div className="hidden md:flex items-center gap-3">
                                            <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Word Flow</span>
                                            </div>
                                            <button
                                                onClick={() => setShowInspiration(!showInspiration)}
                                                className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-300 ${showInspiration ? 'bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800/30' : 'opacity-40 hover:opacity-100'}`}
                                            >
                                                <div className="w-2 h-2 bg-pink-500 rounded-full" />
                                                <span className={`text-[10px] font-medium uppercase tracking-wider ${showInspiration ? 'text-pink-600 dark:text-pink-400' : 'text-gray-500'}`}>Insights</span>
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 font-light mt-1.5 uppercase tracking-widest italic opacity-60">Visualizing your creative engine</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Interval Toggles */}
                                <div className="flex bg-gray-100/80 dark:bg-gray-900/50 p-1 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-inner">
                                    {['daily', 'weekly', 'monthly'].map((v) => (
                                        <button
                                            key={v}
                                            onClick={() => setView(v)}
                                            className={`
                                                px-5 py-2 text-[11px] rounded-xl transition-all duration-500 uppercase tracking-widest font-medium
                                                ${view === v
                                                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-xl shadow-indigo-200/20 dark:shadow-none scale-[1.05]'
                                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}
                                            `}
                                        >
                                            {v === 'daily' ? '日' : v === 'weekly' ? '周' : '月'}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={onClose}
                                    className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all hover:scale-110 active:scale-95 group ml-2"
                                >
                                    <X size={20} className="text-gray-400 group-hover:text-red-400 transition-colors" />
                                </button>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="relative bg-white/50 dark:bg-black/20 rounded-[2.5rem] p-4 md:p-8 border border-white/40 dark:border-gray-800/50 backdrop-blur-sm min-h-[360px] flex items-center justify-center">
                            {!hasData ? (
                                <div className="flex flex-col items-center gap-4 text-gray-300 dark:text-gray-700 select-none">
                                    <TrendingUp size={48} strokeWidth={1} className="opacity-20 animate-pulse" />
                                    <p className="text-sm font-light uppercase tracking-[0.2em]">Silence is the canvas of future noise</p>
                                </div>
                            ) : (
                                <div className="relative h-full w-full">
                                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                                        <defs>
                                            <linearGradient id="wordGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
                                                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Grid Lines (Horizontal) */}
                                        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                                            <line
                                                key={r}
                                                x1={paddingX}
                                                y1={paddingY + r * (height - paddingY * 2)}
                                                x2={width - paddingX}
                                                y2={paddingY + r * (height - paddingY * 2)}
                                                stroke="currentColor"
                                                className="text-gray-100 dark:text-gray-800/30"
                                                strokeDasharray="8 8"
                                                strokeWidth="1"
                                            />
                                        ))}

                                        {/* Word Area Fill */}
                                        <motion.path
                                            d={wordPathArea}
                                            fill="url(#wordGradient)"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 1.5 }}
                                        />

                                        {/* Inspiration Line (Conditional) */}
                                        <AnimatePresence>
                                            {showInspiration && (
                                                <motion.path
                                                    key="inspiration-line"
                                                    d={inspirationPathLine}
                                                    fill="none"
                                                    stroke="#f472b6"
                                                    strokeWidth="2"
                                                    strokeOpacity="0.3"
                                                    strokeLinecap="round"
                                                    strokeDasharray="4 6"
                                                    initial={{ pathLength: 0, opacity: 0 }}
                                                    animate={{ pathLength: 1, opacity: 0.3 }}
                                                    exit={{ opacity: 0, transition: { duration: 0.5 } }}
                                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                                />
                                            )}
                                        </AnimatePresence>

                                        {/* Word Line (Front) */}
                                        <motion.path
                                            d={wordPathLine}
                                            fill="none"
                                            stroke="#818cf8"
                                            strokeWidth="3"
                                            strokeOpacity="0.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, ease: "easeInOut" }}
                                        />

                                        {/* Word Points & Persistent Labels */}
                                        {wordPoints.map((p, i) => (
                                            <g key={`w-${i}`} className="group">
                                                {/* Invisible Hit Area for Stability */}
                                                <circle
                                                    cx={p.x}
                                                    cy={p.y}
                                                    r="15"
                                                    fill="transparent"
                                                    className="cursor-pointer"
                                                />
                                                <text
                                                    x={p.x}
                                                    y={p.y - 18}
                                                    textAnchor="middle"
                                                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                                                    className={`text-[10px] fill-indigo-500/80 dark:fill-indigo-400 font-bold tracking-tighter transition-all duration-300 pointer-events-none group-hover:scale-125 ${p.value === 0 ? 'opacity-0' : 'opacity-100'}`}
                                                >
                                                    {formatNumber(p.value)}
                                                </text>
                                                <motion.circle
                                                    cx={p.x}
                                                    cy={p.y}
                                                    r="4"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                                                    transition={{ delay: 0.4 + i * 0.04 }}
                                                    className="fill-white dark:fill-gray-950 stroke-indigo-400 dark:stroke-indigo-600 stroke-[2px] transition-all duration-300 group-hover:stroke-indigo-500 group-hover:scale-150 pointer-events-none shadow-lg"
                                                />
                                            </g>
                                        ))}

                                        {/* Inspiration Points (Conditional) */}
                                        <AnimatePresence>
                                            {showInspiration && inspirationPoints.map((p, i) => (
                                                <motion.g
                                                    key={`i-${i}`}
                                                    className="group"
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0 }}
                                                    transition={{ delay: 0.2 + i * 0.03 }}
                                                >
                                                    {/* Invisible Hit Area */}
                                                    <circle
                                                        cx={p.x}
                                                        cy={p.y}
                                                        r="12"
                                                        fill="transparent"
                                                        className="cursor-help"
                                                    />
                                                    <text
                                                        x={p.x}
                                                        y={p.y + 24}
                                                        textAnchor="middle"
                                                        style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                                                        className={`text-[9px] fill-pink-500/60 dark:fill-pink-400/50 font-medium tracking-tighter transition-all duration-300 pointer-events-none group-hover:scale-110 ${p.value === 0 ? 'opacity-0' : 'opacity-100'}`}
                                                    >
                                                        {p.value}
                                                    </text>
                                                    <circle
                                                        cx={p.x}
                                                        cy={p.y}
                                                        r="2.5"
                                                        style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                                                        className="fill-white dark:fill-gray-950 stroke-pink-300 dark:stroke-pink-800 stroke-[1.5px] transition-all duration-300 group-hover:scale-150 pointer-events-none"
                                                    />
                                                </motion.g>
                                            ))}
                                        </AnimatePresence>

                                        {/* X-Axis Labels */}
                                        {wordPoints.filter((_, i) => i % (view === 'daily' ? 2 : 1) === 0).map((p, i) => (
                                            <text
                                                key={i}
                                                x={p.x}
                                                y={height - 15}
                                                textAnchor="middle"
                                                className="text-[10px] fill-gray-300 dark:fill-gray-600 font-light tracking-widest uppercase opacity-80"
                                            >
                                                {p.label}
                                            </text>
                                        ))}
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="mt-12 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 font-light italic px-6 uppercase tracking-[0.2em] border-t border-gray-100/50 dark:border-gray-800/30 pt-8">
                            <div className="flex items-center gap-3">
                                <Sparkles size={14} className="text-indigo-300 dark:text-indigo-800" />
                                <span>Soul Dynamics Engine</span>
                            </div>
                            <div className="text-[9px] opacity-30 not-italic hidden md:block">
                                Locally computed • Privacy first
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DataChartModal;
