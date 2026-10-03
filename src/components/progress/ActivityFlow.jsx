import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import ChartTooltip from './ChartTooltip';

function getLastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}

function getHeatmapLevel(active, duration) {
    if (!active) return 'level-0';
    const mins = Math.round(duration / 60);
    if (mins < 10) return 'level-1';
    if (mins < 30) return 'level-2';
    return 'level-3';
}

export default function ActivityFlow() {
    const { readingSessions } = useAppStore();
    const [chartMode, setChartMode] = useState('flow');
    const sessions = readingSessions || [];

    const last7Days = useMemo(() => getLastNDays(7), []);
    const dailyActivity = useMemo(() => {
        return last7Days.map(date => {
            const daySessions = sessions.filter(s => s.date === date);
            const totalSeconds = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' });
            return { name: dayLabel, minutes: Math.round(totalSeconds / 60), date };
        });
    }, [sessions, last7Days]);

    const last35Days = useMemo(() => getLastNDays(35), []);
    const heatmapData = useMemo(() => {
        return last35Days.map(date => {
            const daySessions = sessions.filter(s => s.date === date);
            const totalSeconds = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            return { date, active: daySessions.length > 0, duration: totalSeconds };
        });
    }, [sessions, last35Days]);

    return (
        <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6 flex flex-col">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                    <Activity size={18} className="text-[var(--accent-primary)]" /> Activity Flow
                </div>
                <div className="flex bg-[var(--bg-surface)] rounded-full p-1">
                    <button
                        className={`px-3 py-1 rounded-full font-mono text-[0.6rem] uppercase tracking-widest transition-colors ${chartMode === 'flow' ? 'bg-[var(--h-white)] border-[1.5px] border-[var(--h-bone-dark)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        onClick={() => setChartMode('flow')}
                    >
                        7 Days
                    </button>
                    <button
                        className={`px-3 py-1 rounded-full font-mono text-[0.6rem] uppercase tracking-widest transition-colors ${chartMode === 'heatmap' ? 'bg-[var(--h-white)] border-[1.5px] border-[var(--h-bone-dark)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        onClick={() => setChartMode('heatmap')}
                    >
                        Heatmap
                    </button>
                </div>
            </div>

            <div className="h-[240px] w-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {chartMode === 'flow' ? (
                        <motion.div key="flow" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}m`} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--accent-light)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="minutes"
                                        stroke="url(#colorBar)"
                                        strokeWidth={3}
                                        dot={{ fill: 'var(--h-cream)', stroke: 'var(--accent-primary)', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, fill: 'var(--accent-primary)', stroke: 'var(--h-cream)', strokeWidth: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </motion.div>
                    ) : (
                        <motion.div key="heatmap" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="w-full flex flex-col justify-center">
                            <div className="flex items-end justify-center py-4 overflow-x-auto no-scrollbar">
                                <div className="flex gap-2">
                                    {Array.from({ length: 5 }).map((_, colIndex) => (
                                        <div key={colIndex} className="flex flex-col gap-2">
                                            {heatmapData.slice(colIndex * 7, (colIndex + 1) * 7).map((day, i) => {
                                                const d = new Date(day.date + 'T00:00:00');
                                                const level = getHeatmapLevel(day.active, day.duration);
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`w-4 h-4 md:w-5 md:h-5 rounded-[4px] transition-all duration-300 hover:scale-125 hover:z-10 cursor-pointer shadow-sm ${
                                                            level === 'level-0' ? 'bg-[var(--bg-surface)] shadow-none opacity-50' :
                                                            level === 'level-1' ? 'bg-[var(--accent-light)] border border-[var(--accent-primary)]/20' :
                                                            level === 'level-2' ? 'bg-[var(--accent-primary)] opacity-80' :
                                                            'bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                                        }`}
                                                        title={`${d.toDateString()} — ${day.active ? `${Math.round(day.duration / 60)}m` : 'No activity'}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[var(--text-secondary)] mr-1">Less</span>
                                <div className="w-3 h-3 rounded-[3px] bg-[var(--bg-surface)] opacity-50" />
                                <div className="w-3 h-3 rounded-[3px] bg-[var(--accent-light)] border border-[var(--accent-primary)]/20" />
                                <div className="w-3 h-3 rounded-[3px] bg-[var(--accent-primary)] opacity-80" />
                                <div className="w-3 h-3 rounded-[3px] bg-[#10b981]" />
                                <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[var(--text-secondary)] ml-1">More</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
