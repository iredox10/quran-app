import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Layers } from 'lucide-react';
import ChartTooltip from './ChartTooltip';
import PeriodTabs from './PeriodTabs';
import {
    ACTIVITY_TYPES,
    TYPE_META,
    filterByRange,
    summarize,
    formatDuration,
    rangeTitle,
} from '../../utils/activity';

const MIX_TABS = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'all', label: 'All Time' },
];

export default function ActivityMix() {
    const { readingSessions } = useAppStore();
    const sessions = readingSessions || [];
    const [range, setRange] = useState('week');

    const rangeSessions = useMemo(() => filterByRange(sessions, range), [sessions, range]);
    const totals = useMemo(() => summarize(rangeSessions), [rangeSessions]);

    const activityByType = useMemo(() => (
        ACTIVITY_TYPES
            .map((type) => {
                const seconds = totals.byType[type] || 0;
                const share = totals.seconds > 0 ? Math.round((seconds / totals.seconds) * 100) : 0;
                return {
                    type,
                    name: TYPE_META[type].label,
                    color: TYPE_META[type].color,
                    seconds,
                    value: Math.round(seconds / 60),
                    share,
                };
            })
            .filter((entry) => entry.seconds > 0)
    ), [totals]);

    const hasData = activityByType.length > 0;

    return (
        <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6 flex flex-col">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                    <Layers size={18} className="text-[var(--accent-primary)]" /> Activity Mix
                </div>
                <PeriodTabs tabs={MIX_TABS} value={range} onChange={setRange} ariaLabel="Activity mix period" />
            </div>
            <div className="mb-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)]">{rangeTitle(range)}</div>
            <div className="flex-1 flex items-center justify-center relative">
                {hasData ? (
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
                                {activityByType.map((entry) => (
                                    <Cell key={entry.type} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="py-8 text-[0.85rem] text-[var(--text-secondary)]">No activity in this period yet.</div>
                )}
                {hasData && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="font-ui text-[1.4rem] font-bold text-[var(--text-primary)]">{formatDuration(totals.seconds)}</div>
                        <div className="font-mono text-[0.55rem] uppercase tracking-widest text-[var(--text-secondary)]">
                            {totals.count} Session{totals.count === 1 ? '' : 's'}
                        </div>
                    </div>
                )}
            </div>
            {hasData && (
                <div className="grid gap-2 mt-4">
                    {activityByType.map((item) => (
                        <div key={item.type} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="flex-1 font-ui text-[0.8rem] text-[var(--text-secondary)]">{item.name}</span>
                            <span className="font-ui text-[0.8rem] font-bold text-[var(--text-primary)]">{item.value}m</span>
                            <span className="w-10 text-right font-mono text-[0.6rem] text-[var(--text-secondary)]">{item.share}%</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
