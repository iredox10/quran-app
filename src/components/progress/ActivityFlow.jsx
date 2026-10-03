import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { useQuery } from '@tanstack/react-query';
import { getChapters } from '../../services/api/quranApi';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ChartTooltip from './ChartTooltip';
import PeriodTabs from './PeriodTabs';
import {
    RANGE_TABS,
    rangeKeys,
    previousRangeKeys,
    filterByRange,
    bucketByDay,
    bucketByHour,
    summarize,
    deltaPercent,
    formatDuration,
    rangeTitle,
    lastNDayKeys,
    dateKey,
    ACTIVITY_TYPES,
    TYPE_META,
} from '../../utils/activity';
import { buildSessionLog, MINUTES_CHIPS, MAX_LOG_MINUTES } from '../../utils/activityRecord';

const MotionDiv = motion.div;

const EMPTY_LABEL = { today: 'today', week: 'this week', month: 'this month' };
const PREV_LABEL = { today: 'yesterday', week: 'last week', month: 'last month' };

function filterByKeys(list, keys) {
    if (!keys) return list;
    const set = new Set(keys);
    return list.filter((s) => set.has(s.date));
}

function getHeatmapLevel(active, duration) {
    if (!active) return 'level-0';
    const mins = Math.round(duration / 60);
    if (mins < 10) return 'level-1';
    if (mins < 30) return 'level-2';
    return 'level-3';
}

function DeltaBadge({ delta, hasData, compareLabel }) {
    let className = 'bg-[var(--bg-surface)] text-[var(--text-secondary)]';
    let icon = <Minus size={11} />;
    let text = '0%';
    if (!hasData) {
        text = 'No data';
    } else if (delta === null) {
        text = 'No baseline';
    } else if (delta > 0) {
        className = 'bg-[#10b981]/10 text-[#10b981]';
        icon = <TrendingUp size={11} />;
        text = `+${delta}%`;
    } else if (delta < 0) {
        className = 'bg-[#e75344]/10 text-[#e75344]';
        icon = <TrendingDown size={11} />;
        text = `${delta}%`;
    }
    return (
        <span
            title={`Compared with ${compareLabel}`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-widest ${className}`}
        >
            {icon}
            {text}
        </span>
    );
}

function StatCell({ label, value }) {
    return (
        <div className="rounded-[16px] bg-[var(--bg-surface)] px-3 py-2">
            <div className="font-mono text-[0.55rem] uppercase tracking-widest text-[var(--text-secondary)]">{label}</div>
            <div className="mt-0.5 font-ui text-[1.05rem] font-bold leading-tight text-[var(--text-primary)]">{value}</div>
        </div>
    );
}

export default function ActivityFlow() {
    const { readingSessions, logReadingSession } = useAppStore();
    const sessions = useMemo(() => readingSessions || [], [readingSessions]);

    const [range, setRange] = useState('today');
    const [view, setView] = useState('chart');
    const [logOpen, setLogOpen] = useState(false);
    const [logType, setLogType] = useState('reading');
    const [logMinutes, setLogMinutes] = useState('');
    const [logChapterId, setLogChapterId] = useState('');
    const [logError, setLogError] = useState(null);
    const [logConfirm, setLogConfirm] = useState(null);
    const confirmTimerRef = useRef(null);

    const { data: chapters = [] } = useQuery({ queryKey: ['chapters'], queryFn: getChapters, staleTime: Infinity });

    const now = useMemo(() => new Date(), []);
    const keys = useMemo(() => rangeKeys(range, now), [range, now]);
    const prevKeys = useMemo(() => previousRangeKeys(range, now), [range, now]);
    const rangeSessions = useMemo(() => filterByRange(sessions, range, now), [sessions, range, now]);
    const prevSessions = useMemo(() => filterByKeys(sessions, prevKeys), [sessions, prevKeys]);
    const summary = useMemo(() => summarize(rangeSessions), [rangeSessions]);
    const prevSummary = useMemo(() => summarize(prevSessions), [prevSessions]);
    const delta = deltaPercent(summary.seconds, prevSummary.seconds);
    const hasData = summary.seconds > 0 || prevSummary.seconds > 0;

    const chartData = useMemo(() => {
        if (range === 'today') return bucketByHour(sessions, keys[0]);
        const days = bucketByDay(sessions, keys);
        if (range === 'month') return days.map((d) => ({ ...d, name: String(Number(d.key.slice(8))) }));
        return days;
    }, [range, sessions, keys]);

    const heatmapData = useMemo(
        () => bucketByDay(sessions, lastNDayKeys(35, dateKey(now))),
        [sessions, now]
    );

    useEffect(() => () => {
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    }, []);

    const closeLogForm = () => {
        setLogOpen(false);
        setLogType('reading');
        setLogMinutes('');
        setLogChapterId('');
        setLogError(null);
        setLogConfirm(null);
        if (confirmTimerRef.current) {
            clearTimeout(confirmTimerRef.current);
            confirmTimerRef.current = null;
        }
    };

    const handleLogSubmit = (event) => {
        event.preventDefault();
        const payload = buildSessionLog({ type: logType, minutes: logMinutes, chapterId: logChapterId });
        if (!payload.ok) {
            setLogConfirm(null);
            setLogError(payload.error);
            return;
        }
        logReadingSession(payload.duration, payload.type, payload.chapterId);
        setLogError(null);
        const minutes = Math.round(payload.duration / 60);
        setLogConfirm(
            `Logged ${minutes} min of ${TYPE_META[payload.type].label}${payload.capped ? ` (capped at ${MAX_LOG_MINUTES} min)` : ''}.`
        );
        setLogMinutes('');
        setLogChapterId('');
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = setTimeout(() => setLogConfirm(null), 3500);
    };

    return (
        <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6 flex flex-col">
            <svg width="0" height="0" aria-hidden="true" focusable="false">
                <defs>
                    <linearGradient id="activityFlowBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-primary)" />
                        <stop offset="100%" stopColor="var(--accent-light)" />
                    </linearGradient>
                </defs>
            </svg>

            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                    <Activity size={18} className="text-[var(--accent-primary)]" /> Activity Flow
                </div>
                <button
                    type="button"
                    onClick={() => (logOpen ? closeLogForm() : setLogOpen(true))}
                    aria-expanded={logOpen}
                    className={`flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--h-bone-dark)] px-3 py-1 font-mono text-[0.6rem] uppercase tracking-widest transition-colors ${
                        logOpen
                            ? 'bg-[var(--accent-light)] text-[var(--accent-primary)]'
                            : 'bg-[var(--h-white)] text-[var(--text-primary)] hover:bg-[var(--accent-light)] hover:text-[var(--accent-primary)]'
                    }`}
                >
                    <Plus size={12} /> Log activity
                </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <PeriodTabs tabs={RANGE_TABS} value={range} onChange={setRange} ariaLabel="Activity range" />
                <div className="flex bg-[var(--bg-surface)] rounded-full p-1">
                    <button
                        type="button"
                        aria-pressed={view === 'chart'}
                        className={`px-3 py-1 rounded-full font-mono text-[0.6rem] uppercase tracking-widest transition-colors ${view === 'chart' ? 'bg-[var(--h-white)] border-[1.5px] border-[var(--h-bone-dark)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        onClick={() => setView('chart')}
                    >
                        Chart
                    </button>
                    <button
                        type="button"
                        aria-pressed={view === 'heatmap'}
                        className={`px-3 py-1 rounded-full font-mono text-[0.6rem] uppercase tracking-widest transition-colors ${view === 'heatmap' ? 'bg-[var(--h-white)] border-[1.5px] border-[var(--h-bone-dark)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        onClick={() => setView('heatmap')}
                    >
                        Heatmap
                    </button>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {logOpen && (
                    <MotionDiv
                        key="log-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <form
                            onSubmit={handleLogSubmit}
                            noValidate
                            className="mb-4 rounded-[16px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] p-4"
                        >
                            <div role="radiogroup" aria-label="Activity type" className="mb-3 flex flex-wrap gap-1.5">
                                {ACTIVITY_TYPES.map((type) => {
                                    const active = logType === type;
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            onClick={() => {
                                                setLogType(type);
                                                setLogError(null);
                                            }}
                                            className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-widest transition-colors ${
                                                active
                                                    ? 'border-[var(--h-bone-dark)] bg-[var(--h-cream)] text-[var(--text-primary)] shadow-sm'
                                                    : 'border-transparent bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_META[type].color }} />
                                            {TYPE_META[type].label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
                                <div>
                                    <label htmlFor="activity-flow-minutes" className="mb-1 block font-mono text-[0.55rem] uppercase tracking-widest text-[var(--text-secondary)]">
                                        Minutes
                                    </label>
                                    <input
                                        id="activity-flow-minutes"
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={MAX_LOG_MINUTES}
                                        step={1}
                                        placeholder="15"
                                        value={logMinutes}
                                        onChange={(e) => {
                                            setLogMinutes(e.target.value);
                                            setLogError(null);
                                        }}
                                        aria-invalid={Boolean(logError)}
                                        className="w-[4.5rem] rounded-[10px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-ui text-[0.85rem] font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                                    />
                                </div>

                                <div className="flex gap-1.5 pb-0.5">
                                    {MINUTES_CHIPS.map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            aria-label={`Set ${m} minutes`}
                                            onClick={() => {
                                                setLogMinutes(String(m));
                                                setLogError(null);
                                            }}
                                            className={`rounded-full border-[1.5px] px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-widest transition-colors ${
                                                String(m) === logMinutes
                                                    ? 'border-[var(--h-bone-dark)] bg-[var(--h-cream)] text-[var(--text-primary)] shadow-sm'
                                                    : 'border-transparent bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>

                                {chapters.length > 0 && (
                                    <div className="min-w-[9.5rem] flex-1">
                                        <label htmlFor="activity-flow-surah" className="mb-1 block font-mono text-[0.55rem] uppercase tracking-widest text-[var(--text-secondary)]">
                                            Surah (optional)
                                        </label>
                                        <select
                                            id="activity-flow-surah"
                                            value={logChapterId}
                                            onChange={(e) => setLogChapterId(e.target.value)}
                                            className="w-full rounded-[10px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-ui text-[0.85rem] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                                        >
                                            <option value="">None</option>
                                            {chapters.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.id}. {c.name_simple}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <p aria-live="polite" className="min-h-[1.1rem] text-[0.75rem] font-medium">
                                    {logError && <span className="text-[#e75344]">{logError}</span>}
                                    {!logError && logConfirm && <span className="text-[#10b981]">{logConfirm}</span>}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={closeLogForm}
                                        className="rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-full bg-[var(--accent-primary)] px-4 py-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-white shadow-md transition-transform hover:scale-105 active:scale-95"
                                    >
                                        Log session
                                    </button>
                                </div>
                            </div>
                        </form>
                    </MotionDiv>
                )}
            </AnimatePresence>

            <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)]">
                        {rangeTitle(range, now)}
                    </span>
                    <DeltaBadge delta={delta} hasData={hasData} compareLabel={PREV_LABEL[range]} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <StatCell label="Total time" value={formatDuration(summary.seconds)} />
                    <StatCell label="Sessions" value={summary.count} />
                    <StatCell label="Active days" value={`${summary.activeDays}/${keys.length}`} />
                    <StatCell label="Avg / day" value={`${summary.avgPerActiveDay}m`} />
                </div>
            </div>

            <div className="h-[240px] w-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                    {view === 'heatmap' ? (
                        <MotionDiv key="heatmap" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="w-full flex flex-col justify-center">
                            <div className="flex items-end justify-center py-4 overflow-x-auto no-scrollbar">
                                <div className="flex gap-2">
                                    {Array.from({ length: 5 }).map((_, colIndex) => (
                                        <div key={colIndex} className="flex flex-col gap-2">
                                            {heatmapData.slice(colIndex * 7, (colIndex + 1) * 7).map((day, i) => {
                                                const d = new Date(day.key + 'T00:00:00');
                                                const level = getHeatmapLevel(day.count > 0, day.seconds);
                                                return (
                                                    <div
                                                        key={i}
                                                        className={`w-4 h-4 md:w-5 md:h-5 rounded-[4px] transition-all duration-300 hover:scale-125 hover:z-10 cursor-pointer shadow-sm ${
                                                            level === 'level-0' ? 'bg-[var(--bg-surface)] shadow-none opacity-50' :
                                                            level === 'level-1' ? 'bg-[var(--accent-light)] border border-[var(--accent-primary)]/20' :
                                                            level === 'level-2' ? 'bg-[var(--accent-primary)] opacity-80' :
                                                            'bg-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                                        }`}
                                                        title={`${d.toDateString()} — ${day.count > 0 ? `${Math.round(day.seconds / 60)}m` : 'No activity'}`}
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
                        </MotionDiv>
                    ) : summary.count === 0 ? (
                        <MotionDiv
                            key={`empty-${range}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex h-full w-full flex-col items-center justify-center px-6 text-center"
                        >
                            <Activity size={34} className="mb-3 text-[var(--accent-primary)]/50" />
                            <p className="mb-1 font-ui text-[1rem] font-bold text-[var(--text-primary)]">
                                Nothing logged {EMPTY_LABEL[range]} yet
                            </p>
                            <p className="max-w-[320px] text-[0.85rem] leading-[1.5] text-[var(--text-secondary)]">
                                Every session you record adds to your flow. Log one above, or open a Surah and let the time track itself.
                            </p>
                        </MotionDiv>
                    ) : (
                        <MotionDiv key={`chart-${range}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="w-full h-full">
                            {range === 'month' ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" interval={4} stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}m`} />
                                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--accent-light)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                                        <Line
                                            type="monotone"
                                            dataKey="minutes"
                                            stroke="var(--accent-primary)"
                                            strokeWidth={2.5}
                                            dot={{ r: 2, fill: 'var(--accent-primary)', strokeWidth: 0 }}
                                            activeDot={{ r: 5, fill: 'var(--accent-primary)', stroke: 'var(--h-cream)', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" interval={range === 'today' ? 3 : 0} stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}m`} />
                                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--accent-light)', fillOpacity: 0.3 }} />
                                        <Bar
                                            dataKey="minutes"
                                            fill="url(#activityFlowBar)"
                                            radius={[6, 6, 0, 0]}
                                            maxBarSize={range === 'today' ? 18 : 36}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
