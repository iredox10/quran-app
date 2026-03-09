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

/* --- UI Components --- */
const Card = ({ children, style }) => (
    <section style={{
        padding: '1.5rem',
        borderRadius: '24px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '1.5rem',
        ...style
    }}>
        {children}
    </section>
);

const StatCard = ({ icon, label, value, helper }) => (
    <div style={{ padding: '1.15rem', borderRadius: '20px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ color: 'var(--accent-primary)', marginBottom: '0.6rem' }}>{icon}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontWeight: 700 }}>{label}</div>
        <div style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1.2 }}>{value}</div>
        {helper && <div style={{ color: 'var(--text-secondary)', marginTop: '0.3rem', fontSize: '0.84rem' }}>{helper}</div>}
    </div>
);

/* --- Main Component --- */
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setStartUnit(1);
            setEndUnit(max);
            setDurationDays((current) => Math.min(current, max));
            return;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStartUnit((current) => Math.min(Math.max(1, current), max));
        setEndUnit((current) => Math.min(Math.max(1, current), max));
        setDurationDays((current) => Math.min(current, max));
    }, [plannerScope, unitType]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <div className="container" style={{ paddingBottom: '6rem' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
                
                {/* Header Section */}
                <Card style={{ background: 'linear-gradient(145deg, var(--bg-surface), var(--bg-secondary))' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 300px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.4rem 0.8rem', borderRadius: '999px', background: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.82rem', marginBottom: '1rem' }}>
                                <Sparkles size={14} aria-hidden="true" />
                                Personal Reading Journey
                            </div>
                            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: '0.8rem' }}>
                                Build a gentle plan that fits your rhythm.
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '1.05rem', maxWidth: '600px' }}>
                                Set a clear target, choose your duration, and progress step by step. Every day gives you one concrete goal to accomplish.
                            </p>
                        </div>

                        {plannerOverview && (
                            <div style={{ minWidth: '240px', flex: '0 1 auto', padding: '1.25rem', borderRadius: '20px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Current Plan Progress</div>
                                    <Target size={16} color="var(--accent-primary)" />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{plannerOverview.completedCount}</div>
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
                </Card>

                {/* My Planners Manager */}
                {planners?.length > 0 && (
                    <Card>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                            <div>
                                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>My Planners</h3>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>Switch between different reading tracks</div>
                            </div>
                            <button
                                onClick={() => setShowCreator(!showCreator)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '999px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}
                            >
                                {showCreator ? 'Cancel Creation' : 'Create New'} <Settings2 size={14} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {planners.map((item) => {
                                const isActive = item.id === activePlannerId;
                                const overview = getPlannerOverview(item);
                                return (
                                    <div key={item.id} style={{
                                        padding: '1.1rem',
                                        borderRadius: '20px',
                                        border: `2px solid ${isActive ? 'var(--accent-primary)' : 'rgba(0,0,0,0.04)'}`,
                                        background: isActive ? 'var(--accent-light)' : 'var(--bg-primary)',
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{item.title || `${PLANNER_UNITS[item.unitType].label} Plan`}</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                                                    {PLANNER_UNITS[item.unitType].label} {item.startUnit}-{item.endUnit}
                                                </div>
                                            </div>
                                            {isActive && <span style={{ padding: '0.25rem 0.6rem', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Active</span>}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            <div style={{ flex: 1, height: '6px', background: isActive ? 'rgba(0,0,0,0.05)' : 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{ width: `${(overview?.completedCount / item.durationDays) * 100}%`, height: '100%', background: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                                            </div>
                                            <span>{overview?.completedCount || 0}/{item.durationDays}</span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {!isActive && (
                                                <button onClick={() => setActivePlanner(item.id)} style={{ flex: 1, padding: '0.6rem', borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    Set Active
                                                </button>
                                            )}
                                            <button onClick={() => setPlannerToDelete(item)} style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', color: 'rgb(239, 68, 68)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: isActive ? '100%' : '42px' }}>
                                                <Trash2 size={16} /> {isActive && <span style={{ marginLeft: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Delete Plan</span>}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {/* Planner Creator Form */}
                {showCreator && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <Card style={{ border: '1px solid var(--accent-light)', boxShadow: '0 10px 40px -10px var(--accent-light)' }}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>Configure New Plan</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>Set up your reading unit, scope, and duration to generate a personalized timeline.</p>
                            </div>

                            <div style={{ display: 'grid', gap: '1.8rem' }}>
                                
                                {/* Step 1: Unit */}
                                <div>
                                    <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.8rem', fontWeight: 700 }}>1. Choose Your Unit</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem' }}>
                                        {plannerUnitOptions.map((option) => {
                                            const active = option.id === unitType;
                                            return (
                                                <button key={option.id} onClick={() => {
                                                    setUnitType(option.id);
                                                    setDurationDays((current) => Math.min(current, PLANNER_UNITS[option.id].max));
                                                    if (plannerScope === 'full') {
                                                        setStartUnit(1);
                                                        setEndUnit(PLANNER_UNITS[option.id].max);
                                                    }
                                                }} style={{
                                                    padding: '1.1rem', borderRadius: '18px', textAlign: 'left',
                                                    background: active ? 'var(--accent-light)' : 'var(--bg-primary)',
                                                    border: `2px solid ${active ? 'var(--accent-primary)' : 'rgba(0,0,0,0.04)'}`,
                                                    transition: 'all 0.2s',
                                                }}>
                                                    <div style={{ fontWeight: 700, color: active ? 'var(--accent-primary)' : 'var(--text-primary)', marginBottom: '0.3rem' }}>{option.label}</div>
                                                    <div style={{ color: active ? 'var(--accent-primary)' : 'var(--text-secondary)', opacity: active ? 0.8 : 1, fontSize: '0.85rem', lineHeight: 1.4 }}>{option.description}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Step 2 & 3: Scope and Range */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', padding: '1.5rem', background: 'var(--bg-primary)', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.8rem', fontWeight: 700 }}>2. Choose Scope</div>
                                        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: '999px' }}>
                                            {[ { id: 'full', label: `Full ${unitMeta.plural}` }, { id: 'custom', label: 'Custom Range' } ].map((option) => (
                                                <button key={option.id} onClick={() => setPlannerScope(option.id)} style={{
                                                    flex: 1, padding: '0.7rem 1rem', borderRadius: '999px',
                                                    background: plannerScope === option.id ? 'var(--bg-primary)' : 'transparent',
                                                    color: plannerScope === option.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                    fontWeight: plannerScope === option.id ? 700 : 600,
                                                    boxShadow: plannerScope === option.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                                    transition: 'all 0.2s',
                                                }}>
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {plannerScope === 'custom' && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Start {unitMeta.label}</span>
                                                <input type="number" min="1" max={unitMeta.max} value={startUnit} onChange={(e) => setStartUnit(Number(e.target.value))} style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }} />
                                            </label>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>End {unitMeta.label}</span>
                                                <input type="number" min={startUnit} max={unitMeta.max} value={endUnit} onChange={(e) => setEndUnit(Number(e.target.value))} style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }} />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Step 4: Duration & Date */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>3. Start Date</span>
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '1rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', fontWeight: 600 }} />
                                    </label>

                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>4. Duration (Days)</span>
                                        <div style={{ padding: '1rem', borderRadius: '16px', background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.08)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                                                <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{durationDays} Days</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Max {scopedUnitCount}</span>
                                            </div>
                                            <input type="range" min="1" max={scopedUnitCount} step="1" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} className="settings-slider" style={{ width: '100%' }} />
                                        </div>
                                    </label>
                                </div>

                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700 }}>5. Optional Title</span>
                                    <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g. Ramadan Khatmah" style={{ padding: '1rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }} />
                                </label>

                                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    {planners?.length > 0 && <button onClick={() => setShowCreator(false)} style={{ padding: '0.85rem 1.5rem', borderRadius: '999px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 700 }}>Cancel</button>}
                                    <button onClick={handleGeneratePlanner} style={{ padding: '0.85rem 2rem', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px var(--accent-light)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                        <PlusCircle size={18} /> Generate Plan
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Empty State */}
                {!planner && !showCreator && (
                    <Card style={{ textAlign: 'center', padding: '3rem 2rem', background: 'linear-gradient(to bottom, var(--bg-surface), var(--bg-primary))' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <Compass size={40} color="var(--accent-primary)" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.8rem' }}>No Active Plan</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
                            A consistent reading habit starts with a good plan. Create one tailored to your pace and start making daily progress.
                        </p>
                        <button onClick={() => setShowCreator(true)} style={{ padding: '0.9rem 2rem', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px var(--accent-light)' }}>
                            <PlusCircle size={18} /> Create Your First Plan
                        </button>
                    </Card>
                )}

                {/* Planner Active State Views */}
                {planner && plannerOverview && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                        
                        {/* Stats Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            <StatCard icon={<Flag size={20} />} label="Plan Type" value={planner.title || PLANNER_UNITS[planner.unitType].label} />
                            <StatCard icon={<CalendarDays size={20} />} label="Start Date" value={formatPlannerDateLabel(planner.startDate)} />
                            <StatCard icon={<Compass size={20} />} label="Scope" value={`${PLANNER_UNITS[planner.unitType].label} ${planner.startUnit}-${planner.endUnit}`} />
                        </div>

                        {plannerSuccess && plannerOverview.completedCount > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                                <StatCard icon={<Trophy size={20} />} label="Success Rate" value={`${plannerSuccess.successRate}%`} helper="Completed on time" />
                                <StatCard icon={<Target size={20} />} label="Consistency" value={`${plannerSuccess.consistencyStreak} Day${plannerSuccess.consistencyStreak !== 1 ? 's' : ''}`} helper="Current on-time streak" />
                            </div>
                        )}

                        {/* Daily Timeline */}
                        <Card style={{ padding: '0', overflow: 'hidden' }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Daily Timeline</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Your step-by-step reading journey</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
                                {planner.assignments.map((assignment, index) => {
                                    const status = getAssignmentStatus(planner, assignment);
                                    const statusMeta = statusStyles[status];
                                    const progress = getAssignmentProgress(planner, assignment);
                                    const isDone = progress.isComplete;
                                    const isFirst = index === 0;

                                    return (
                                        <div key={assignment.dayNumber} style={{ 
                                            padding: '1.5rem', 
                                            borderBottom: '1px solid rgba(0,0,0,0.04)',
                                            background: isDone ? 'rgba(34, 197, 94, 0.03)' : status === 'today' ? 'var(--bg-primary)' : 'transparent',
                                            display: 'grid',
                                            gridTemplateColumns: 'auto 1fr',
                                            gap: '1.5rem',
                                            position: 'relative'
                                        }}>
                                            
                                            {/* Timeline Visual */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                                                <button onClick={() => togglePlannerDayComplete(assignment.dayNumber)} style={{
                                                    width: '48px', height: '48px', borderRadius: '50%', 
                                                    background: isDone ? '#22c55e' : status === 'today' ? 'var(--accent-light)' : 'var(--bg-secondary)',
                                                    color: isDone ? '#fff' : status === 'today' ? 'var(--accent-primary)' : 'var(--text-muted)',
                                                    border: `2px solid ${isDone ? '#22c55e' : status === 'today' ? 'var(--accent-primary)' : 'rgba(0,0,0,0.08)'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    zIndex: 2, transition: 'all 0.2s',
                                                    boxShadow: status === 'today' && !isDone ? '0 0 0 4px var(--bg-primary), 0 0 0 6px var(--accent-light)' : 'none'
                                                }}>
                                                    <CheckCircle2 size={24} />
                                                </button>
                                                {!isFirst && <div style={{ position: 'absolute', top: '-1.5rem', bottom: '50%', left: '50%', width: '2px', background: isDone ? '#22c55e' : 'rgba(0,0,0,0.06)', transform: 'translateX(-50%)', zIndex: 1 }} />}
                                                <div style={{ position: 'absolute', top: '50%', bottom: '-1.5rem', left: '50%', width: '2px', background: isDone ? '#22c55e' : 'rgba(0,0,0,0.06)', transform: 'translateX(-50%)', zIndex: 1 }} />
                                            </div>

                                            {/* Assignment Content */}
                                            <div style={{ minWidth: 0, paddingBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Day {assignment.dayNumber}</span>
                                                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: statusMeta.background, color: statusMeta.color, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {statusMeta.label}
                                                    </span>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{formatPlannerDateLabel(assignment.date)}</span>
                                                </div>
                                                
                                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>{assignment.title}</div>
                                                <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.95rem' }}>{assignment.subtitle}</div>

                                                <div style={{ marginTop: '1.2rem', padding: '1rem', borderRadius: '16px', background: isDone ? 'rgba(34, 197, 94, 0.06)' : 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.04)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: isDone ? '#16a34a' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                                                            <Target size={16} /> Progress: {progress.completedCount} / {progress.totalCount}
                                                        </div>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                                                            {Math.round(progress.completionRatio * 100)}%
                                                        </span>
                                                    </div>
                                                    
                                                    <input type="range" min="0" max={progress.totalCount} step="1" value={progress.completedCount} onChange={(e) => setPlannerAssignmentProgress(assignment.dayNumber, Number(e.target.value))} className="settings-slider" style={{ width: '100%', marginBottom: '1rem' }} />

                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <Link to={assignment.primaryRoute} state={{ backToPlanner: true }} style={{ padding: '0.6rem 1.2rem', borderRadius: '999px', background: 'var(--accent-light)', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }} 
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.background = 'var(--accent-primary)';
                                                                e.currentTarget.style.color = '#fff';
                                                            }} 
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.background = 'var(--accent-light)';
                                                                e.currentTarget.style.color = 'var(--accent-primary)';
                                                            }}>
                                                            <span style={{ color: 'inherit' }}>Read Assignment</span>
                                                            <ArrowRight size={14} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </motion.div>
                )}
            </motion.div>

            {/* Delete Warning Modal */}
            <AnimatePresence>
                {plannerToDelete && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPlannerToDelete(null)}
                            style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{ position: 'relative', width: '100%', maxWidth: '400px', background: 'var(--bg-primary)', borderRadius: '24px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', zIndex: 1 }}
                        >
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                <Trash2 size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Delete Planner?</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '2rem' }}>
                                Are you sure you want to delete the <strong>{plannerToDelete.title || `${PLANNER_UNITS[plannerToDelete.unitType].label} Plan`}</strong>? All progress tracked under this plan will be permanently lost.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button 
                                    onClick={() => setPlannerToDelete(null)}
                                    style={{ flex: 1, padding: '0.85rem', borderRadius: '999px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 700 }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        deletePlanner(plannerToDelete.id);
                                        setPlannerToDelete(null);
                                    }}
                                    style={{ flex: 1, padding: '0.85rem', borderRadius: '999px', background: 'rgb(239, 68, 68)', color: '#fff', fontWeight: 700 }}
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
