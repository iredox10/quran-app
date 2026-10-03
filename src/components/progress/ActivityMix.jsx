import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Layers } from 'lucide-react';
import ChartTooltip from './ChartTooltip';

export default function ActivityMix() {
    const { readingSessions } = useAppStore();
    const sessions = readingSessions || [];

    const activityByType = useMemo(() => {
        const typeMap = { reading: 0, memorizing: 0, listening: 0, pomodoro: 0 };
        sessions.forEach(s => {
            if (typeMap[s.type] !== undefined) {
                typeMap[s.type] += s.duration || 0;
            }
        });
        return [
            { name: 'Reading', value: Math.round(typeMap.reading / 60), color: '#10b981' },
            { name: 'Memorizing', value: Math.round(typeMap.memorizing / 60), color: '#3b82f6' },
            { name: 'Focus', value: Math.round(typeMap.pomodoro / 60), color: '#8b5cf6' },
        ].filter(item => item.value > 0);
    }, [sessions]);

    const allTimeTotal = useMemo(() => sessions.reduce((sum, s) => sum + (s.duration || 0), 0), [sessions]);

    return (
        <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6 flex flex-col">
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                    <Layers size={18} className="text-[var(--accent-primary)]" /> Activity Mix
                </div>
                <span className="px-3 py-1 rounded-full bg-[var(--bg-surface)] font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)]">All Time</span>
            </div>
            <div className="flex-1 flex items-center justify-center relative">
                {activityByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={activityByType}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={6}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={8}
                            >
                                {activityByType.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-[0.85rem] text-[var(--text-secondary)]">No activity data yet.</div>
                )}
                {activityByType.length > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="font-ui text-[1.4rem] font-bold text-[var(--text-primary)]">{Math.round(allTimeTotal / 60)}</div>
                        <div className="font-mono text-[0.55rem] uppercase tracking-widest text-[var(--text-secondary)]">Mins Total</div>
                    </div>
                )}
            </div>
            {activityByType.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {activityByType.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-ui text-[0.8rem] text-[var(--text-secondary)]">{item.name}</span>
                            <span className="font-ui text-[0.8rem] font-bold text-[var(--text-primary)]">{item.value}m</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
