import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Target, Activity, CalendarDays, BookMarked } from 'lucide-react';

const memoryData = [
    { name: 'Mon', strength: 65 },
    { name: 'Tue', strength: 70 },
    { name: 'Wed', strength: 68 },
    { name: 'Thu', strength: 82 },
    { name: 'Fri', strength: 90 },
    { name: 'Sat', strength: 85 },
    { name: 'Sun', strength: 95 },
];

const hifdhData = [
    { name: 'Completed', value: 3 },
    { name: 'Weak', value: 2 },
    { name: 'Remaining', value: 25 },
];
const COLORS = ['var(--accent-primary)', '#8D9B9C', '#EFECE4']; // using Ethereal palette mapping

const timeData = [
    { name: 'Listening', hours: 4 },
    { name: 'Reciting', hours: 6 },
    { name: 'Reading', hours: 2 },
];

export default function Progress() {
    const { setNavHeaderTitle } = useAppStore();

    useEffect(() => {
        setNavHeaderTitle('Progress & Analytics');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>

                {/* Top Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {[
                        { label: 'Current Streak', value: '14 Days', icon: <Activity size={20} /> },
                        { label: 'Juz Memorized', value: '3.5', icon: <BookMarked size={20} /> },
                        { label: 'Target Date', value: 'Nov 2026', icon: <Target size={20} /> },
                        { label: 'Daily Avg', value: '45 mins', icon: <CalendarDays size={20} /> },
                    ].map((stat, i) => (
                        <div key={i} style={{
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
                        }}>
                            <div style={{ color: 'var(--accent-primary)' }}>{stat.icon}</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stat.value}</h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.label}</span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                    {/* Memory Strength Graph */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Memory Strength Over Time</h4>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <LineChart data={memoryData}>
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }} />
                                    <Line type="monotone" dataKey="strength" stroke="var(--accent-primary)" strokeWidth={3} dot={{ fill: 'var(--accent-primary)', r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Hifdh Tracker */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Hifdh Distribution (Juz)</h4>
                        <div style={{ width: '100%', height: 250, position: 'relative' }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={hifdhData}
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {hifdhData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>10%</span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Complete</div>
                            </div>
                        </div>
                    </div>

                    {/* Time Distribution */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
                        <h4 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Activity Distribution (Hrs)</h4>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <BarChart data={timeData}>
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: 'var(--accent-light)' }} contentStyle={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }} />
                                    <Bar dataKey="hours" fill="var(--color-ink)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Forecast Block */}
                    <div style={{
                        padding: '2rem',
                        background: 'linear-gradient(135deg, var(--accent-light), transparent)',
                        borderRadius: '16px',
                        border: '1px solid var(--accent-light)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '1rem'
                    }}>
                        <Target size={32} color="var(--accent-primary)" />
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>AI Forecast</h4>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            At your current velocity of memorizing 4 pages per week with an 85% retention rate, your predicted Hifdh completion is <strong style={{ color: 'var(--accent-primary)' }}>November 2026</strong>. Focus on active recall for weak segments to improve your baseline.
                        </p>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
