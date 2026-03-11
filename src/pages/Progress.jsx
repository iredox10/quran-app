import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Target, Activity, CalendarDays, BookMarked, BookOpen, Layers, Clock, TrendingUp } from 'lucide-react';

const TOTAL_SURAHS = 114;
const TOTAL_JUZ = 30;

function getLastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}

function formatMinutes(seconds) {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export default function Progress() {
    const { setNavHeaderTitle, readingSessions, recentlyRead, bookmarks, collections, pomodoroHistory } = useAppStore();

    useEffect(() => {
        setNavHeaderTitle('Progress & Analytics');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const sessions = readingSessions || [];
    const today = new Date().toISOString().split('T')[0];

    // === Compute Stats ===

    // Daily activity for the last 7 days
    const last7Days = getLastNDays(7);
    const dailyActivity = useMemo(() => {
        return last7Days.map(date => {
            const daySessions = sessions.filter(s => s.date === date);
            const totalSeconds = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' });
            return { name: dayLabel, minutes: Math.round(totalSeconds / 60), date };
        });
    }, [sessions]);

    // Activity breakdown by type
    const activityByType = useMemo(() => {
        const typeMap = { reading: 0, memorizing: 0, listening: 0, pomodoro: 0 };
        sessions.forEach(s => {
            if (typeMap[s.type] !== undefined) {
                typeMap[s.type] += s.duration || 0;
            }
        });
        return [
            { name: 'Reading', minutes: Math.round(typeMap.reading / 60) },
            { name: 'Memorizing', minutes: Math.round(typeMap.memorizing / 60) },
            { name: 'Listening', minutes: Math.round(typeMap.listening / 60) },
            { name: 'Pomodoro', minutes: Math.round(typeMap.pomodoro / 60) },
        ];
    }, [sessions]);

    const pomodoroFocusMinutes = useMemo(() => {
        return (pomodoroHistory || [])
            .filter((session) => session.mode === 'focus')
            .reduce((sum, session) => sum + (session.duration || 0), 0);
    }, [pomodoroHistory]);

    const pomodoroFocusCount = useMemo(() => {
        return (pomodoroHistory || []).filter((session) => session.mode === 'focus').length;
    }, [pomodoroHistory]);

    // Unique surahs read
    const uniqueSurahsRead = useMemo(() => {
        const surahIds = new Set();
        (recentlyRead || []).forEach(r => surahIds.add(r.chapterId));
        sessions.forEach(s => { if (s.chapterId) surahIds.add(s.chapterId); });
        return surahIds.size;
    }, [sessions, recentlyRead]);

    // Streak calculation
    const streak = useMemo(() => {
        if (sessions.length === 0) return 0;
        const uniqueDates = [...new Set(sessions.map(s => s.date))].sort().reverse();
        let count = 0;
        const checkDate = new Date();

        for (let i = 0; i < 365; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (uniqueDates.includes(dateStr)) {
                count++;
            } else if (i > 0) {
                break; // Gap found
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }
        return count;
    }, [sessions]);

    // Today's total
    const todayTotal = useMemo(() => {
        return sessions.filter(s => s.date === today).reduce((sum, s) => sum + (s.duration || 0), 0);
    }, [sessions, today]);

    // Total all-time
    const allTimeTotal = useMemo(() => {
        return sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    }, [sessions]);

    // Surah completion pie chart
    const surahData = [
        { name: 'Read', value: uniqueSurahsRead },
        { name: 'Remaining', value: TOTAL_SURAHS - uniqueSurahsRead },
    ];
    const COLORS = ['var(--accent-primary)', 'var(--border-color)'];

    // Weekly trend (last 4 weeks)
    const weeklyTrend = useMemo(() => {
        const weeks = [];
        for (let w = 3; w >= 0; w--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - (w * 7));

            let total = 0;
            const startStr = weekStart.toISOString().split('T')[0];
            const endStr = weekEnd.toISOString().split('T')[0];

            sessions.forEach(s => {
                if (s.date >= startStr && s.date <= endStr) {
                    total += s.duration || 0;
                }
            });

            weeks.push({ name: `W${4 - w}`, minutes: Math.round(total / 60) });
        }
        return weeks;
    }, [sessions]);

    const hasData = sessions.length > 0;

    return (
        <div className="container" style={{ paddingBottom: '6rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>

                {/* Top Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {[
                        { label: 'Current Streak', value: `${streak} Day${streak !== 1 ? 's' : ''}`, icon: <Activity size={20} /> },
                        { label: 'Surahs Read', value: `${uniqueSurahsRead} / ${TOTAL_SURAHS}`, icon: <BookMarked size={20} /> },
                        { label: 'Today', value: formatMinutes(todayTotal), icon: <Clock size={20} /> },
                        { label: 'All Time', value: formatMinutes(allTimeTotal), icon: <TrendingUp size={20} /> },
                        { label: 'Pomodoro Focus', value: formatMinutes(pomodoroFocusMinutes), icon: <Target size={20} /> },
                        { label: 'Focus Sessions', value: `${pomodoroFocusCount}`, icon: <CalendarDays size={20} /> },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            style={{
                                padding: '1.5rem',
                                background: 'var(--bg-surface)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                boxShadow: 'var(--shadow-sm)',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <div style={{ color: 'var(--accent-primary)' }}>{stat.icon}</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.label}</span>
                        </motion.div>
                    ))}
                </div>

                {!hasData && (
                    <div style={{
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        marginBottom: '2rem'
                    }}>
                        <BookOpen size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Start Your Journey</h3>
                        <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '400px', margin: '0 auto' }}>
                            Your reading and memorization activity will appear here as you use the app. Open a Surah to begin tracking your progress!
                        </p>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                    {/* Daily Activity Graph */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Daily Activity (Last 7 Days)</h4>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <LineChart data={dailyActivity}>
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} unit="m" />
                                    <Tooltip
                                        formatter={(value) => [`${value} min`, 'Time Spent']}
                                        contentStyle={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }}
                                    />
                                    <Line type="monotone" dataKey="minutes" stroke="var(--accent-primary)" strokeWidth={3} dot={{ fill: 'var(--accent-primary)', r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Surah Progress */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Surah Coverage</h4>
                        <div style={{ width: '100%', height: 250, position: 'relative' }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={surahData}
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {surahData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {Math.round((uniqueSurahsRead / TOTAL_SURAHS) * 100)}%
                                </span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Explored</div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Breakdown */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Activity Breakdown</h4>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <BarChart data={activityByType}>
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} unit="m" />
                                    <Tooltip
                                        formatter={(value) => [`${value} min`, 'Total']}
                                        cursor={{ fill: 'var(--accent-light)' }}
                                        contentStyle={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }}
                                    />
                                    <Bar dataKey="minutes" fill="var(--accent-primary)" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Weekly Trend */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Weekly Trend</h4>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <BarChart data={weeklyTrend}>
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} unit="m" />
                                    <Tooltip
                                        formatter={(value) => [`${value} min`, 'Total']}
                                        cursor={{ fill: 'var(--accent-light)' }}
                                        contentStyle={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }}
                                    />
                                    <Bar dataKey="minutes" fill="var(--color-ink, var(--text-muted))" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* 30-Day Activity Heatmap */}
                <div style={{ marginTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600 }}>Activity Heatmap</h3>
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
                            {getLastNDays(30).map((date, i) => {
                                const active = sessions.some(s => s.date === date);
                                const d = new Date(date + 'T00:00:00');
                                return (
                                    <div
                                        key={i}
                                        title={d.toDateString()}
                                        style={{
                                            width: 'calc((100% / 10) - 8px)',
                                            paddingBottom: 'calc((100% / 10) - 8px)',
                                            background: active ? 'var(--accent-primary)' : 'var(--accent-light)',
                                            opacity: active ? 1 : 0.4,
                                            borderRadius: '4px'
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Bookmarks & Collections Summary */}
                <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookMarked size={24} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(bookmarks || []).length}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bookmarks</div>
                        </div>
                    </div>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers size={24} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(collections || []).length}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Collections</div>
                        </div>
                    </div>
                    <div style={{
                        padding: '1.5rem',
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CalendarDays size={24} color="var(--accent-primary)" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(recentlyRead || []).length}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Recent Surahs</div>
                        </div>
                    </div>
                </div>

            </motion.div>
        </div>
    );
}
