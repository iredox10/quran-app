import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Play, PlayCircle, BookOpen, Clock, Calendar, CheckCircle, TrendingUp, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { setNavHeaderTitle, recentlyRead } = useAppStore();

    useEffect(() => {
        setNavHeaderTitle('Dashboard');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning, Hafiz';
        if (hour < 18) return 'Good Afternoon, Hafiz';
        return 'Good Evening, Hafiz';
    };

    const nextTime = () => {
        const hour = new Date().getHours();
        if (hour < 6) return 'Fajr approaches';
        if (hour < 13) return 'Dhuhr approaches';
        if (hour < 16) return 'Asr approaches';
        if (hour < 19) return 'Maghrib approaches';
        return 'Isha approaches';
    };

    const streakData = Array.from({ length: 30 }).map((_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000),
        active: Math.random() > 0.3 // mock data
    }));

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                {/* Context Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        <Clock size={16} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{nextTime()}</span>
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                        {greeting()}
                    </h1>
                </div>

                {/* The Pulse Card */}
                <Link to={recentlyRead[0] ? `/memorize/${recentlyRead[0].chapterId}` : '/memorize'} style={{ textDecoration: 'none' }}>
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: '2rem',
                            background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-surface))',
                            borderRadius: '16px',
                            border: '1px solid var(--accent-light)',
                            boxShadow: 'var(--shadow-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '3rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <span style={{ color: 'var(--accent-primary)', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Revision Required
                            </span>
                            <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                {recentlyRead[0] ? recentlyRead[0].chapterName : 'Surah Al-Mulk'}
                            </h2>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    <TrendingUp size={16} /> 85% Retention
                                </div>
                            </div>
                        </div>

                        {/* Progress Ring Mockup */}
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'conic-gradient(var(--accent-primary) 85%, transparent 0)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Mic size={24} color="var(--accent-primary)" />
                            </div>
                        </div>

                        {/* Decorative Background Icon */}
                        <BookOpen size={180} style={{ position: 'absolute', right: '-20px', bottom: '-40px', color: 'var(--accent-light)', opacity: 0.5, zIndex: 0 }} />
                    </motion.div>
                </Link>

                {/* Contextual Suggestions */}
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Suggested for you</h3>
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                    {[
                        { title: 'Surah Al-Kahf', context: 'Friday Sunnah', icon: <Calendar size={20} /> },
                        { title: 'Surah Al-Waqiah', context: 'Night Routine', icon: <Clock size={20} /> },
                        { title: 'Surah As-Sajdah', context: 'Before Sleep', icon: <CheckCircle size={20} /> },
                    ].map((item, idx) => (
                        <div key={idx} style={{
                            minWidth: '160px',
                            padding: '1.5rem',
                            background: 'var(--bg-surface)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'var(--shadow-sm)',
                            flexShrink: 0
                        }}>
                            <div style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }}>{item.icon}</div>
                            <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{item.title}</h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.context}</span>
                        </div>
                    ))}
                </div>

                {/* Streak Visualization */}
                <div style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600 }}>Activity Correlation</h3>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Last 30 days</span>
                    </div>
                    <div style={{
                        background: 'var(--bg-surface)',
                        padding: '1.5rem',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {streakData.map((day, i) => (
                                <div
                                    key={i}
                                    title={day.date.toDateString()}
                                    style={{
                                        width: 'calc((100% / 10) - 8px)',
                                        paddingBottom: 'calc((100% / 10) - 8px)',
                                        background: day.active ? 'var(--accent-primary)' : 'var(--accent-light)',
                                        opacity: day.active ? 1 : 0.3,
                                        borderRadius: '4px'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}
