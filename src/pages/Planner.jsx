import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Compass, Flag, Sparkles, Target, Trophy, Trash2 } from 'lucide-react';

import { getChapters } from '../services/api/quranApi';
import { useAppStore } from '../store/useAppStore';
import {
    PLANNER_UNITS,
    buildReadingPlanner,
    formatPlannerDate,
    formatPlannerDateLabel,
    getAssignmentProgress,
    getAssignmentStatus,
    getPlannerUnitItems,
    getPlannerOverview,
    getPlannerSuccessMetrics,
} from '../utils/planner';

const plannerUnitOptions = [
    { id: 'page', label: 'Page Plan', description: 'Finish the Quran by Mushaf pages.' },
    { id: 'juz', label: 'Juz Plan', description: 'Read by 30 equal juz sections.' },
    { id: 'hizb', label: 'Hizb Plan', description: 'Use 60 smaller checkpoints.' },
    { id: 'surah', label: 'Surah Plan', description: 'Move chapter by chapter.' },
];

const statusStyles = {
    completed: { label: 'Done', color: '#22c55e', background: 'rgba(34, 197, 94, 0.12)' },
    today: { label: 'Today', color: 'var(--accent-primary)', background: 'var(--accent-light)' },
    overdue: { label: 'Catch Up', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.14)' },
    upcoming: { label: 'Upcoming', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' },
};

export default function Planner() {
    const {
        setNavHeaderTitle,
        planner,
        setPlanner,
        clearPlanner,
        togglePlannerDayComplete,
        setPlannerAssignmentProgress,
    } = useAppStore();

    const { data: chapters } = useQuery({
        queryKey: ['chapters'],
        queryFn: getChapters,
        staleTime: Infinity,
    });

    const [unitType, setUnitType] = useState(planner?.unitType || 'page');
    const [durationDays, setDurationDays] = useState(planner?.durationDays || 30);
    const [startDate, setStartDate] = useState(planner?.startDate || formatPlannerDate(new Date()));
    const [plannerScope, setPlannerScope] = useState(planner?.isCustomRange ? 'custom' : 'full');
    const [startUnit, setStartUnit] = useState(planner?.startUnit || 1);
    const [endUnit, setEndUnit] = useState(planner?.endUnit || PLANNER_UNITS[planner?.unitType || 'page'].max);
    const [customTitle, setCustomTitle] = useState(planner?.title || '');

    useEffect(() => {
        setNavHeaderTitle('Reading Planner');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const unitMeta = PLANNER_UNITS[unitType];
    const plannerOverview = useMemo(() => getPlannerOverview(planner), [planner]);
    const plannerSuccess = useMemo(() => getPlannerSuccessMetrics(planner), [planner]);
    const unitItems = useMemo(() => getPlannerUnitItems(unitType, chapters || []), [unitType, chapters]);

    useEffect(() => {
        const max = PLANNER_UNITS[unitType].max;
        if (plannerScope === 'full') {
            setStartUnit(1);
            setEndUnit(max);
            setDurationDays((current) => Math.min(current, max));
            return;
        }

        setStartUnit((current) => Math.min(Math.max(1, current), max));
        setEndUnit((current) => Math.min(Math.max(1, current), max));
        setDurationDays((current) => Math.min(current, max));
    }, [plannerScope, unitType]);

    useEffect(() => {
        if (endUnit < startUnit) {
            setEndUnit(startUnit);
        }
    }, [endUnit, startUnit]);

    const scopedUnitCount = plannerScope === 'full' ? unitMeta.max : Math.max(endUnit - startUnit + 1, 1);

    const handleGeneratePlanner = () => {
        const nextPlanner = buildReadingPlanner({
            unitType,
            durationDays,
            startDate,
            startUnit: plannerScope === 'full' ? 1 : startUnit,
            endUnit: plannerScope === 'full' ? unitMeta.max : endUnit,
            customTitle,
        }, chapters || []);
        setPlanner(nextPlanner);
    };

    return (
        <div className="container" style={{ paddingBottom: '6rem' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <section
                    style={{
                        padding: '1.5rem',
                        borderRadius: '24px',
                        background: 'linear-gradient(145deg, var(--bg-surface), var(--bg-secondary))',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-md)',
                        marginBottom: '1.5rem',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.7rem', borderRadius: '999px', background: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.9rem' }}>
                                <Sparkles size={14} aria-hidden="true" />
                                Personal Planner
                            </div>
                            <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                                Build a gentle Quran plan that fits your rhythm.
                            </h1>
                            <p style={{ maxWidth: '620px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                                Mature Quran apps usually frame planning around a clear unit, a realistic duration, and a visible daily checkpoint. This planner follows that pattern so each day has one concrete reading target.
                            </p>
                        </div>

                        {plannerOverview && (
                            <div style={{ minWidth: '220px', padding: '1rem 1.1rem', borderRadius: '20px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Current Plan</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{plannerOverview.completedCount}/{planner.durationDays}</div>
                                <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>days completed</div>
                                <div style={{ marginTop: '0.9rem', height: '8px', borderRadius: '999px', background: 'var(--accent-light)', overflow: 'hidden' }}>
                                    <div style={{ width: `${plannerOverview.completionRatio * 100}%`, height: '100%', background: 'var(--accent-primary)' }} />
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section
                    style={{
                        padding: '1.25rem',
                        borderRadius: '24px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)',
                        marginBottom: '1.5rem',
                    }}
                >
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.85rem', fontWeight: 700 }}>1. Choose Your Unit</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                {plannerUnitOptions.map((option) => {
                                    const active = option.id === unitType;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => {
                                                setUnitType(option.id);
                                                setDurationDays((current) => Math.min(current, PLANNER_UNITS[option.id].max));
                                                if (plannerScope === 'full') {
                                                    setStartUnit(1);
                                                    setEndUnit(PLANNER_UNITS[option.id].max);
                                                }
                                            }}
                                            style={{
                                                padding: '1rem',
                                                borderRadius: '18px',
                                                textAlign: 'left',
                                                background: active ? 'var(--accent-light)' : 'var(--bg-primary)',
                                                border: `1px solid ${active ? 'rgba(198, 168, 124, 0.35)' : 'rgba(0,0,0,0.06)'}`,
                                                color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
                                            }}
                                        >
                                            <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{option.label}</div>
                                            <div style={{ color: active ? 'var(--accent-primary)' : 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{option.description}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.85rem', fontWeight: 700 }}>2. Choose Scope</div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {[
                                    { id: 'full', label: `Full ${unitMeta.plural}` },
                                    { id: 'custom', label: 'Custom Range' },
                                ].map((option) => {
                                    const active = plannerScope === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setPlannerScope(option.id)}
                                            style={{
                                                minHeight: '42px',
                                                padding: '0.7rem 0.95rem',
                                                borderRadius: '999px',
                                                background: active ? 'var(--accent-light)' : 'var(--bg-primary)',
                                                border: `1px solid ${active ? 'rgba(198, 168, 124, 0.35)' : 'rgba(0,0,0,0.06)'}`,
                                                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>3. Start Date</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(event) => setStartDate(event.target.value)}
                                    style={{ minHeight: '46px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', padding: '0.8rem 0.95rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>4. Duration</span>
                                <div style={{ padding: '0.9rem 1rem', borderRadius: '14px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{durationDays} days</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>up to {scopedUnitCount}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max={scopedUnitCount}
                                        step="1"
                                        value={durationDays}
                                        onChange={(event) => setDurationDays(Number(event.target.value))}
                                        aria-label="Planner duration in days"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </label>
                        </div>

                        {plannerScope === 'custom' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>5. Start {unitMeta.label}</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max={unitMeta.max}
                                        value={startUnit}
                                        onChange={(event) => setStartUnit(Number(event.target.value))}
                                        style={{ minHeight: '46px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', padding: '0.8rem 0.95rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>6. End {unitMeta.label}</span>
                                    <input
                                        type="number"
                                        min={startUnit}
                                        max={unitMeta.max}
                                        value={endUnit}
                                        onChange={(event) => setEndUnit(Number(event.target.value))}
                                        style={{ minHeight: '46px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', padding: '0.8rem 0.95rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </label>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', gridColumn: '1 / -1' }}>
                                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>7. Custom Title</span>
                                    <input
                                        type="text"
                                        value={customTitle}
                                        onChange={(event) => setCustomTitle(event.target.value)}
                                        placeholder="Example: Last 10 days of Ramadan"
                                        aria-label="Custom planner title"
                                        style={{ minHeight: '46px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', padding: '0.8rem 0.95rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                </label>

                                <div style={{ gridColumn: '1 / -1', padding: '0.9rem 1rem', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                                        Scope preview: {unitMeta.label} {startUnit} to {unitMeta.label} {endUnit}
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                        {unitItems.find((item) => item.rangeValue === startUnit)?.title || `${unitMeta.label} ${startUnit}`}
                                        {' '}through{' '}
                                        {unitItems.find((item) => item.rangeValue === endUnit)?.title || `${unitMeta.label} ${endUnit}`}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={handleGeneratePlanner}
                                style={{ minHeight: '46px', padding: '0.85rem 1.2rem', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700 }}
                            >
                                Generate Plan
                            </button>
                            {planner && (
                                <button
                                    type="button"
                                    onClick={clearPlanner}
                                    style={{ minHeight: '46px', padding: '0.85rem 1.1rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Trash2 size={16} aria-hidden="true" />
                                    Clear Plan
                                </button>
                            )}
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                                Example: create a full 30-day Quran plan or a custom plan like Juz 25-30 across the last 10 nights.
                            </span>
                        </div>
                    </div>
                </section>

                {!planner && (
                    <section style={{ padding: '2rem', borderRadius: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <Compass size={42} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                        <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No active plan yet</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.7 }}>
                            Create a plan by pages, juz, hizb, or surah. A good Quran planner should make today obvious, tomorrow visible, and missed days easy to recover.
                        </p>
                    </section>
                )}

                {planner && plannerOverview && (
                    <>
                        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                {[
                                    { label: 'Plan Type', value: planner.title || PLANNER_UNITS[planner.unitType].label, icon: <Flag size={18} /> },
                                    { label: 'Start Date', value: formatPlannerDateLabel(planner.startDate), icon: <CalendarDays size={18} /> },
                                    { label: 'Completed', value: `${plannerOverview.completedCount} / ${planner.durationDays}`, icon: <CheckCircle2 size={18} /> },
                                    { label: 'Scope', value: `${PLANNER_UNITS[planner.unitType].label} ${planner.startUnit}-${planner.endUnit}`, icon: <Compass size={18} /> },
                                ].map((item) => (
                                <div key={item.label} style={{ padding: '1.15rem', borderRadius: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                                    <div style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>{item.icon}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontWeight: 700 }}>{item.label}</div>
                                    <div style={{ color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.35 }}>{item.value}</div>
                                </div>
                            ))}
                        </section>

                        {plannerSuccess && (
                            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                {[
                                    { label: 'Success Rate', value: `${plannerSuccess.successRate}%`, helper: 'Completed on time', icon: <Trophy size={18} /> },
                                    { label: 'On Time', value: String(plannerSuccess.onTimeCount), helper: 'Finished by target date', icon: <CheckCircle2 size={18} /> },
                                    { label: 'Late Finish', value: String(plannerSuccess.lateCount), helper: 'Completed after due date', icon: <CalendarDays size={18} /> },
                                    { label: 'Consistency', value: `${plannerSuccess.consistencyStreak} Day${plannerSuccess.consistencyStreak !== 1 ? 's' : ''}`, helper: 'On-time streak', icon: <Target size={18} /> },
                                ].map((item) => (
                                    <div key={item.label} style={{ padding: '1.15rem', borderRadius: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>{item.icon}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontWeight: 700 }}>{item.label}</div>
                                        <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.3rem', lineHeight: 1.2 }}>{item.value}</div>
                                        <div style={{ color: 'var(--text-secondary)', marginTop: '0.3rem', fontSize: '0.84rem' }}>{item.helper}</div>
                                    </div>
                                ))}
                            </section>
                        )}

                        <section style={{ padding: '1rem', borderRadius: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.4rem 0.5rem 1rem 0.5rem', flexWrap: 'wrap' }}>
                                <div>
                                    <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 700 }}>Daily Plan</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Tap into the day’s reading target and mark it complete when finished.</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {planner.assignments.map((assignment) => {
                                    const status = getAssignmentStatus(planner, assignment);
                                    const statusMeta = statusStyles[status];
                                    const progress = getAssignmentProgress(planner, assignment);
                                    const isDone = progress.isComplete;

                                    return (
                                        <div
                                            key={assignment.dayNumber}
                                            style={{
                                                padding: '1rem',
                                                borderRadius: '20px',
                                                background: isDone ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-primary)',
                                                border: `1px solid ${isDone ? 'rgba(34, 197, 94, 0.22)' : 'rgba(0,0,0,0.06)'}`,
                                                display: 'grid',
                                                gridTemplateColumns: 'auto 1fr auto',
                                                gap: '0.9rem',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => togglePlannerDayComplete(assignment.dayNumber)}
                                                aria-label={isDone ? `Mark day ${assignment.dayNumber} incomplete` : `Mark day ${assignment.dayNumber} complete`}
                                                style={{ width: '42px', height: '42px', borderRadius: '50%', background: isDone ? '#22c55e' : 'var(--bg-secondary)', color: isDone ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.06)' }}
                                            >
                                                <CheckCircle2 size={20} aria-hidden="true" />
                                            </button>

                                             <div style={{ minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                                                        <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Day {assignment.dayNumber}</span>
                                                        <span style={{ padding: '0.24rem 0.55rem', borderRadius: '999px', background: statusMeta.background, color: statusMeta.color, fontSize: '0.75rem', fontWeight: 700 }}>
                                                            {statusMeta.label}
                                                        </span>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{formatPlannerDateLabel(assignment.date)}</span>
                                                        {progress.completedAt && (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                                                Completed {formatPlannerDateLabel(progress.completedAt)}
                                                            </span>
                                                        )}
                                                    </div>
                                                 <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{assignment.title}</div>
                                                 <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 }}>{assignment.subtitle}</div>

                                                 <div style={{ marginTop: '0.85rem', padding: '0.85rem 0.9rem', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                                                             <Target size={14} aria-hidden="true" />
                                                             <span>Progress {progress.completedCount}/{progress.totalCount}</span>
                                                         </div>
                                                         <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                                             {progress.isComplete ? 'Assignment complete' : `Next: ${progress.nextItem?.title || assignment.title}`}
                                                         </span>
                                                     </div>

                                                     <input
                                                         type="range"
                                                         min="0"
                                                         max={progress.totalCount}
                                                         step="1"
                                                         value={progress.completedCount}
                                                         onChange={(event) => setPlannerAssignmentProgress(assignment.dayNumber, Number(event.target.value))}
                                                         aria-label={`Track progress for day ${assignment.dayNumber}`}
                                                         style={{ width: '100%' }}
                                                     />

                                                     <div style={{ marginTop: '0.55rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                                         <span>Start</span>
                                                         <span>{Math.round(progress.completionRatio * 100)}%</span>
                                                         <span>Done</span>
                                                     </div>
                                                 </div>
                                             </div>

                                            <Link
                                                to={assignment.primaryRoute}
                                                state={{ backToPlanner: true }}
                                                style={{ minHeight: '42px', padding: '0.75rem 0.95rem', borderRadius: '999px', background: 'var(--accent-light)', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                Open
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                )}
            </motion.div>
        </div>
    );
}
