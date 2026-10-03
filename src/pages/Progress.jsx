import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { BookMarked, BookOpen, Layers, Clock, Flame, ChevronRight, Target, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import ActivityFlow from '../components/progress/ActivityFlow';
import ActivityMix from '../components/progress/ActivityMix';
import Achievements from '../components/progress/Achievements';
import RecentActivity from '../components/progress/RecentActivity';

const CircularProgress = ({ percent, color, size = 64, strokeWidth = 6 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle cx={size/2} cy={size/2} r={radius} stroke="var(--bg-surface)" strokeWidth={strokeWidth} fill="none" />
                <circle
                    cx={size/2}
                    cy={size/2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
        </div>
    );
};

export default function Progress() {
    const { setNavHeaderTitle, readingSessions, recentlyRead, bookmarks, collections } = useAppStore();

    useEffect(() => {
        setNavHeaderTitle('Analytics');
        return () => setNavHeaderTitle(null);
    }, [setNavHeaderTitle]);

    const sessions = readingSessions || [];
    const today = new Date().toISOString().split('T')[0];

    const last7Days = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    }, []);

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
                break;
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }
        return count;
    }, [sessions]);

    const todayTotal = useMemo(() => {
        return sessions.filter(s => s.date === today).reduce((sum, s) => sum + (s.duration || 0), 0);
    }, [sessions, today]);

    const weeklyGoalMins = 180;
    const weeklyTotalMins = useMemo(() => {
        return last7Days.reduce((total, date) => {
            const dayTotal = sessions.filter(s => s.date === date).reduce((sum, s) => sum + (s.duration || 0), 0);
            return total + Math.round(dayTotal / 60);
        }, 0);
    }, [sessions, last7Days]);
    const weeklyGoalPercent = Math.min(100, Math.round((weeklyTotalMins / weeklyGoalMins) * 100));

    const smartInsight = useMemo(() => {
        if (sessions.length === 0) return "Start reading to unlock insights!";
        const dayCounts = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
        sessions.forEach(s => {
            const day = new Date(s.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' });
            dayCounts[day] += (s.duration || 0);
        });
        const bestDay = Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b);
        if (dayCounts[bestDay] === 0) return "Start reading to unlock insights!";

        const fullDays = { 'Sun': 'Sundays', 'Mon': 'Mondays', 'Tue': 'Tuesdays', 'Wed': 'Wednesdays', 'Thu': 'Thursdays', 'Fri': 'Fridays', 'Sat': 'Saturdays' };
        return `You usually read best on ${fullDays[bestDay]}. Keep up the great momentum!`;
    }, [sessions]);

    const hasData = sessions.length > 0;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="mx-auto mb-20 max-w-[1200px] px-4 pb-20 text-[var(--text-primary)]">
            <svg width="0" height="0">
                <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-primary)" />
                        <stop offset="100%" stopColor="var(--accent-light)" />
                    </linearGradient>
                </defs>
            </svg>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="mb-6 pt-6 text-center">
                    <span className="mb-1 block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--text-secondary)]">Analytics Dashboard</span>
                    <h1 className="font-ui text-[1.75rem] font-bold text-[var(--text-primary)]">Your Progress</h1>
                    <p className="text-[0.85rem] text-[var(--text-secondary)] mt-1">{greeting}. Here's the story of your consistency.</p>
                </div>

                {hasData && (
                    <div className="mb-6 rounded-[16px] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 px-5 py-3 flex items-center gap-3">
                        <Lightbulb size={18} className="text-[var(--accent-primary)] shrink-0" />
                        <span className="text-[0.85rem] text-[var(--text-primary)] font-medium">{smartInsight}</span>
                    </div>
                )}

                <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative overflow-hidden rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6 flex flex-col justify-between group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)]/10 blur-[40px] rounded-full pointer-events-none transition-transform duration-700 group-hover:scale-150" />
                        <div className="flex items-center justify-between mb-8">
                            <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[var(--text-secondary)]">Consistency</div>
                            <div className="w-10 h-10 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent-primary)] shadow-[0_0_15px_var(--accent-light)]">
                                <Flame size={20} className={streak > 0 ? "animate-pulse text-[#e75344]" : ""} />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-end gap-2">
                                <span className="font-ui text-[3.5rem] font-black leading-none tracking-tight text-[var(--text-primary)]">{streak}</span>
                                <span className="font-ui text-[1rem] font-bold text-[var(--text-secondary)] mb-1">Days</span>
                            </div>
                            <div className="mt-1 text-[0.8rem] text-[var(--text-secondary)]">Current active streak</div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6 flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[var(--text-secondary)]">Today's Focus</div>
                            <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)]">
                                <Clock size={18} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-end gap-2">
                                <span className="font-ui text-[3.5rem] font-black leading-none tracking-tight text-[var(--accent-primary)]">{Math.round(todayTotal / 60)}</span>
                                <span className="font-ui text-[1rem] font-bold text-[var(--accent-primary)]/70 mb-1">Mins</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="h-1.5 flex-1 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                                    <div className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (todayTotal / 60) / 30 * 100)}%` }} />
                                </div>
                                <span className="font-mono text-[0.6rem] text-[var(--text-secondary)] whitespace-nowrap">Goal: 30m</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6 flex flex-col justify-between group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[var(--text-secondary)]">Weekly Goal</div>
                            <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)]">
                                <Target size={18} />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <CircularProgress percent={weeklyGoalPercent} color="var(--accent-primary)" size={70} strokeWidth={6} />
                                <div className="absolute inset-0 flex items-center justify-center font-ui text-[0.9rem] font-bold text-[var(--text-primary)]">
                                    {weeklyGoalPercent}%
                                </div>
                            </div>
                            <div>
                                <div className="font-ui text-[1.4rem] font-bold leading-none text-[var(--text-primary)] mb-1">{weeklyTotalMins} <span className="text-[0.9rem] font-normal text-[var(--text-secondary)]">/ {weeklyGoalMins}m</span></div>
                                <div className="text-[0.75rem] text-[var(--text-secondary)] mt-1">Total this week</div>
                            </div>
                        </div>
                    </div>
                </div>

                {!hasData && (
                    <div className="mb-8 rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] px-6 py-16 text-center relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent-primary)]/5 rounded-full blur-[50px] pointer-events-none" />
                        <BookOpen size={48} className="mx-auto mb-5 text-[var(--accent-primary)]/60" />
                        <h3 className="mb-3 font-ui text-[1.4rem] font-bold text-[var(--text-primary)]">Start Your Journey</h3>
                        <p className="mx-auto max-w-[420px] text-[0.95rem] leading-[1.6] text-[var(--text-secondary)] mb-6">Your reading and memorization activity will beautifully visualize here as you use the app.</p>
                        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-ui font-bold text-[0.9rem] transition-transform hover:scale-105 active:scale-95">
                            Open Quran
                        </Link>
                    </div>
                )}

                <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ActivityFlow />
                    <ActivityMix />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                    <Achievements />
                    <RecentActivity />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[
                        { icon: BookMarked, label: 'Bookmarks', value: (bookmarks || []).length, route: '/bookmarks' },
                        { icon: Layers, label: 'Collections', value: (collections || []).length, route: '/collections' },
                        { icon: BookOpen, label: 'Recent Surahs', value: (recentlyRead || []).length, route: '/' },
                    ].map((item, i) => (
                        <Link to={item.route} key={i} className="group rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-5 md:p-6 flex items-center justify-between transition-all hover:border-[var(--accent-hover)] hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(198,168,124,0.15)]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-primary)] group-hover:bg-[var(--accent-primary)] group-hover:text-[var(--bg-primary)] transition-colors">
                                    <item.icon size={20} />
                                </div>
                                <div>
                                    <div className="font-ui text-[1.4rem] font-bold leading-none text-[var(--text-primary)] mb-1">{item.value}</div>
                                    <div className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">{item.label}</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-50 group-hover:opacity-100 group-hover:text-[var(--accent-primary)] transition-all transform group-hover:translate-x-1" />
                        </Link>
                    ))}
                </div>

            </motion.div>
        </div>
    );
}
