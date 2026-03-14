import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, CheckCircle2, Compass, Flag, PlusCircle, Sparkles, Target, Trophy, Trash2, ArrowRight, Settings2 } from 'lucide-react';

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
import './Planner.css';

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
        planners,
        activePlannerId,
        planner,
        setPlanner,
        setActivePlanner,
        deletePlanner,
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

    const [showCreator, setShowCreator] = useState(!planner);
    const [plannerToDelete, setPlannerToDelete] = useState(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!planner) return;
        setUnitType(planner.unitType || 'page');
        setDurationDays(planner.durationDays || 30);
        setStartDate(planner.startDate || formatPlannerDate(new Date()));
        setPlannerScope(planner.isCustomRange ? 'custom' : 'full');
        setStartUnit(planner.startUnit || 1);
        setEndUnit(planner.endUnit || PLANNER_UNITS[planner.unitType || 'page'].max);
        setCustomTitle(planner.title || '');
        setShowCreator(false);
    }, [planner?.id, planner]);

    useEffect(() => {
        setNavHeaderTitle('Reading Planner');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const unitMeta = PLANNER_UNITS[unitType];
    const plannerOverview = useMemo(() => getPlannerOverview(planner), [planner]);
    const plannerSuccess = useMemo(() => getPlannerSuccessMetrics(planner), [planner]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (endUnit < startUnit) setEndUnit(startUnit);
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
        setShowCreator(false);
    };

    return (
        <div className="planner-container">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>

                {/* Hero Section */}
                <div className="planner-hero">
                    <div className="planner-hero-content">
                        <div className="planner-hero-text">
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.8rem', borderRadius: '999px', background: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.82rem', marginBottom: '1rem' }}>
                                <Sparkles size={14} aria-hidden="true" />
                                Personal Reading Journey
                            </div>
                            <h1 className="planner-hero-title">
                                Build a gentle plan that fits your rhythm.
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1.05rem', maxWidth: '600px' }}>
                                Set a clear target, choose your duration, and progress step by step. Every day gives you one concrete goal to accomplish.
                            </p>
                        </div>

                        {plannerOverview && (
                            <div className="planner-hero-progress stat-card" style={{ minWidth: '240px', flex: '0 1 auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                    <div className="stat-card-label" style={{ marginBottom: 0 }}>Current Plan Progress</div>
                                    <Target size={18} color="var(--accent-primary)" />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                                    <div className="stat-card-value">{plannerOverview.completedCount}</div>
                                    <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ {planner.durationDays} days</div>
                                </div>
                                <div style={{ marginTop: '1.2rem', height: '10px', borderRadius: '999px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${plannerOverview.completionRatio * 100}%` }}
                                        transition={{ duration: 0.8, ease: 'easeOut' }}
                                        style={{ height: '100%', background: 'var(--accent-primary)', borderRadius: '999px' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* My Planners Manager */}
                {planners?.length > 0 && (
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            <div>
                                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>My Planners</h3>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Switch between different reading tracks</div>
                            </div>
                            <button
                                onClick={() => setShowCreator(!showCreator)}
                                className="btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
                            >
                                {showCreator ? 'Cancel Creation' : 'Create New Plan'} <Settings2 size={16} />
                            </button>
                        </div>

                        <div className="planners-grid">
                            {planners.map((item) => {
                                const isActive = item.id === activePlannerId;
                                const overview = getPlannerOverview(item);
                                return (
                                    <div key={item.id} className={`planner-item-card ${isActive ? 'active' : ''}`}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{item.title || `${PLANNER_UNITS[item.unitType].label} Plan`}</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.3rem', fontWeight: isActive ? 600 : 400 }}>
                                                    {PLANNER_UNITS[item.unitType].label} {item.startUnit}-{item.endUnit}
                                                </div>
                                            </div>
                                            {isActive && <span style={{ padding: '0.3rem 0.8rem', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Active</span>}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.04)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            <div style={{ flex: 1, height: '6px', background: isActive ? 'rgba(0,0,0,0.05)' : 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{ width: `${(overview?.completedCount / item.durationDays) * 100}%`, height: '100%', background: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{overview?.completedCount || 0}/{item.durationDays}</span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                                            {!isActive && (
                                                <button onClick={() => setActivePlanner(item.id)} className="btn-secondary" style={{ flex: 1, fontSize: '0.9rem' }}>
                                                    Set Active
                                                </button>
                                            )}
                                            <button onClick={() => setPlannerToDelete(item)} style={{ padding: '0.8rem', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.08)', color: 'rgb(239, 68, 68)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: isActive ? '100%' : 'auto', transition: 'all 0.2s', fontWeight: 600 }}>
                                                <Trash2 size={18} /> {isActive && <span style={{ marginLeft: '0.5rem' }}>Delete Plan</span>}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Planner Creator Form */}
                {showCreator && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                        <div className="planner-hero" style={{ background: 'var(--bg-primary)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
                            <div style={{ marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Configure New Plan</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.4rem' }}>Set up your reading unit, scope, and duration to generate a personalized timeline.</p>
                            </div>

                            <div style={{ display: 'grid', gap: '2rem' }}>

                                {/* Step 1: Unit */}
                                <div>
                                    <div className="stat-card-label" style={{ marginBottom: '1rem' }}>1. Choose Your Unit</div>
                                    <div className="form-grid">
                                        {plannerUnitOptions.map((option) => {
                                            const active = option.id === unitType;
                                            return (
                                                <div key={option.id} onClick={() => {
                                                    setUnitType(option.id);
                                                    setDurationDays((current) => Math.min(current, PLANNER_UNITS[option.id].max));
                                                    if (plannerScope === 'full') {
                                                        setStartUnit(1);
                                                        setEndUnit(PLANNER_UNITS[option.id].max);
                                                    }
                                                }} className={`unit-btn ${active ? 'active' : ''}`}>
                                                    <div style={{ fontWeight: 800, color: active ? 'var(--accent-primary)' : 'var(--text-primary)', marginBottom: '0.4rem', fontSize: '1.1rem' }}>{option.label}</div>
                                                    <div style={{ color: active ? 'var(--accent-primary)' : 'var(--text-secondary)', opacity: active ? 0.9 : 1, fontSize: '0.9rem', lineHeight: 1.5 }}>{option.description}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Step 2 & 3: Scope and Range */}
                                <div style={{ padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.04)' }}>
                                    <div className="form-grid">
                                        <div>
                                            <div className="stat-card-label" style={{ marginBottom: '1rem' }}>2. Choose Scope</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.4rem', borderRadius: '999px' }}>
                                                {[{ id: 'full', label: `Full ${unitMeta.plural}` }, { id: 'custom', label: 'Custom Range' }].map((option) => (
                                                    <button key={option.id} onClick={() => setPlannerScope(option.id)} style={{
                                                        flex: 1, padding: '0.85rem 1rem', borderRadius: '999px',
                                                        background: plannerScope === option.id ? 'var(--bg-primary)' : 'transparent',
                                                        color: plannerScope === option.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                        fontWeight: plannerScope === option.id ? 800 : 600,
                                                        boxShadow: plannerScope === option.id ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
                                                        transition: 'all 0.2s',
                                                    }}>
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {plannerScope === 'custom' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <span className="stat-card-label">Start {unitMeta.label}</span>
                                                    <input type="number" min="1" max={unitMeta.max} value={startUnit} onChange={(e) => setStartUnit(Number(e.target.value))} className="planner-input" />
                                                </label>
                                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <span className="stat-card-label">End {unitMeta.label}</span>
                                                    <input type="number" min={startUnit} max={unitMeta.max} value={endUnit} onChange={(e) => setEndUnit(Number(e.target.value))} className="planner-input" />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 4: Duration & Date */}
                                <div className="form-grid">
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <span className="stat-card-label">3. Start Date</span>
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="planner-input" />
                                    </label>

                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <span className="stat-card-label">4. Duration (Days)</span>
                                        <div style={{ padding: '1.1rem 1.25rem', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.08)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                                <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>{durationDays} Days</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Max {scopedUnitCount}</span>
                                            </div>
                                            <input type="range" min="1" max={scopedUnitCount} step="1" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} className="settings-slider" style={{ width: '100%' }} />
                                        </div>
                                    </label>
                                </div>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span className="stat-card-label">5. Optional Title</span>
                                    <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g. Ramadan Khatmah" className="planner-input" />
                                </label>

                                <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                                    {planners?.length > 0 && <button onClick={() => setShowCreator(false)} className="btn-secondary">Cancel</button>}
                                    <button onClick={handleGeneratePlanner} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <PlusCircle size={20} /> Generate Plan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Empty State */}
                {!planner && !showCreator && (
                    <div className="planner-hero" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-primary)' }}>
                        <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 32px var(--accent-light)' }}>
                            <Compass size={44} color="var(--accent-primary)" />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>No Active Plan</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 2.5rem', lineHeight: 1.7, fontSize: '1.1rem' }}>
                            A consistent reading habit starts with a good plan. Create one tailored to your pace and start making daily progress.
                        </p>
                        <button onClick={() => setShowCreator(true)} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.05rem', padding: '1rem 2.5rem' }}>
                            <PlusCircle size={20} /> Create Your First Plan
                        </button>
                    </div>
                )}

                {/* Planner Active State Views */}
                {planner && plannerOverview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>

                        {/* Stats Section */}
                        <div className="stat-card-grid">
                            <div className="stat-card">
                                <div className="stat-card-icon"><Flag size={20} /></div>
                                <div className="stat-card-label">Plan Type</div>
                                <div className="stat-card-value text-english" style={{ fontSize: '1.25rem' }}>{planner.title || PLANNER_UNITS[planner.unitType].label}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon"><CalendarDays size={20} /></div>
                                <div className="stat-card-label">Start Date</div>
                                <div className="stat-card-value">{formatPlannerDateLabel(planner.startDate)}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-card-icon"><Compass size={20} /></div>
                                <div className="stat-card-label">Scope</div>
                                <div className="stat-card-value">{PLANNER_UNITS[planner.unitType].label} {planner.startUnit}-{planner.endUnit}</div>
                            </div>
                        </div>

                        {plannerSuccess && plannerOverview.completedCount > 0 && (
                            <div className="stat-card-grid">
                                <div className="stat-card">
                                    <div className="stat-card-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}><Trophy size={20} /></div>
                                    <div className="stat-card-label">Success Rate</div>
                                    <div className="stat-card-value" style={{ color: '#22c55e' }}>{plannerSuccess.successRate}%</div>
                                    <div className="stat-card-helper">Completed on time</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-card-icon"><Target size={20} /></div>
                                    <div className="stat-card-label">Consistency</div>
                                    <div className="stat-card-value">{plannerSuccess.consistencyStreak} Day{plannerSuccess.consistencyStreak !== 1 ? 's' : ''}</div>
                                    <div className="stat-card-helper">Current on-time streak</div>
                                </div>
                            </div>
                        )}

                        {/* Daily Timeline */}
                        <div className="timeline-card">
                            <div className="timeline-header">
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>Daily Timeline</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.4rem' }}>Your step-by-step reading journey</p>
                            </div>

                            <ul className="timeline-list">
                                <div className="timeline-line" />
                                {planner.assignments.map((assignment, index) => {
                                    const status = getAssignmentStatus(planner, assignment);
                                    const statusMeta = statusStyles[status];
                                    const progress = getAssignmentProgress(planner, assignment);
                                    const isDone = progress.isComplete;
                                    const isFirst = index === 0;

                                    return (
                                        <li key={assignment.dayNumber} className={`timeline-item ${isDone ? 'done' : status === 'today' ? 'today' : ''}`}>
                                            <div onClick={() => togglePlannerDayComplete(assignment.dayNumber)} className={`timeline-node ${isDone ? 'done' : status === 'today' ? 'today' : ''}`}>
                                                <CheckCircle2 size={24} />
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '1.2rem', color: isDone ? '#16a34a' : 'var(--text-primary)' }}>Day {assignment.dayNumber}</span>
                                                    <span style={{ padding: '0.3rem 0.8rem', borderRadius: '999px', background: statusMeta.background, color: statusMeta.color, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {statusMeta.label}
                                                    </span>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>{formatPlannerDateLabel(assignment.date)}</span>
                                                </div>

                                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{assignment.title}</div>
                                                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1rem' }}>{assignment.subtitle}</div>

                                                <div className={`assignment-card ${isDone ? 'done' : ''}`}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: isDone ? '#16a34a' : 'var(--text-primary)', fontSize: '0.95rem' }}>
                                                            <Target size={18} /> Progress: {progress.completedCount} / {progress.totalCount}
                                                        </div>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
                                                            {Math.round(progress.completionRatio * 100)}%
                                                        </span>
                                                    </div>

                                                    <input type="range" min="0" max={progress.totalCount} step="1" value={progress.completedCount} onChange={(e) => setPlannerAssignmentProgress(assignment.dayNumber, Number(e.target.value))} className="settings-slider" style={{ width: '100%', marginBottom: '1.5rem', height: '8px' }} />

                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <Link to={assignment.primaryRoute} state={{ backToPlanner: true }} style={{ padding: '0.75rem 1.5rem', borderRadius: '999px', background: 'var(--accent-light)', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.background = 'var(--accent-primary)';
                                                                e.currentTarget.style.color = '#fff';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.background = 'var(--accent-light)';
                                                                e.currentTarget.style.color = 'var(--accent-primary)';
                                                            }}>
                                                            <span style={{ color: 'inherit' }}>Read Assignment</span>
                                                            <ArrowRight size={16} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Delete Warning Modal */}
            <AnimatePresence>
                {plannerToDelete && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPlannerToDelete(null)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(6px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{ position: 'relative', width: '100%', maxWidth: '420px', background: 'var(--bg-primary)', borderRadius: '28px', padding: '2.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', zIndex: 1 }}
                        >
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <Trash2 size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Delete Planner?</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem', fontSize: '1.05rem' }}>
                                Are you sure you want to delete the <strong>{plannerToDelete.title || `${PLANNER_UNITS[plannerToDelete.unitType].label} Plan`}</strong>? All progress tracked under this plan will be permanently lost.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setPlannerToDelete(null)} className="btn-secondary" style={{ flex: 1, fontSize: '1rem', padding: '1rem' }}>
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        deletePlanner(plannerToDelete.id);
                                        setPlannerToDelete(null);
                                    }}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '999px', background: 'rgb(239, 68, 68)', color: '#fff', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'filter 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
