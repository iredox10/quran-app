import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Award } from 'lucide-react';

const TOTAL_SURAHS = 114;

export default function Achievements() {
    const { readingSessions, recentlyRead } = useAppStore();
    const sessions = readingSessions || [];

    const uniqueSurahsRead = useMemo(() => {
        const surahIds = new Set();
        (recentlyRead || []).forEach(r => surahIds.add(r.chapterId));
        sessions.forEach(s => { if (s.chapterId) surahIds.add(s.chapterId); });
        return surahIds.size;
    }, [sessions, recentlyRead]);

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

    const allTimeTotal = useMemo(() => sessions.reduce((sum, s) => sum + (s.duration || 0), 0), [sessions]);

    const achievements = useMemo(() => {
        const badges = [];
        if (streak >= 3) badges.push({ icon: '🔥', title: '3-Day Streak', desc: 'Consistency is key.' });
        if (streak >= 7) badges.push({ icon: '🔥', title: '7-Day Streak', desc: 'A whole week!' });
        if (streak >= 30) badges.push({ icon: '🔥', title: '30-Day Streak', desc: 'Unstoppable!' });

        const allTimeMins = Math.round(allTimeTotal / 60);
        if (allTimeMins >= 100) badges.push({ icon: '⏱️', title: '100 Minutes', desc: 'First big milestone.' });
        if (allTimeMins >= 500) badges.push({ icon: '⏱️', title: '500 Minutes', desc: 'Dedicated reader.' });

        if (uniqueSurahsRead >= 5) badges.push({ icon: '🗺️', title: 'Explorer', desc: 'Read 5 Surahs.' });
        if (uniqueSurahsRead >= 30) badges.push({ icon: '🗺️', title: 'Traveler', desc: 'Read 30 Surahs.' });
        if (uniqueSurahsRead === TOTAL_SURAHS) badges.push({ icon: '👑', title: 'Khatm', desc: 'Read all 114 Surahs!' });

        return badges.reverse().slice(0, 3);
    }, [streak, allTimeTotal, uniqueSurahsRead]);

    return (
        <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                    <Award size={18} className="text-[var(--accent-primary)]" /> Achievements
                </div>
            </div>
            {achievements.length > 0 ? (
                <div className="grid gap-3">
                    {achievements.map((badge, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-[16px] bg-[var(--h-white)] border-[1.5px] border-[var(--h-bone-dark)] transition-all hover:bg-[var(--h-bone)] hover:border-[var(--accent-hover)]">
                            <div className="w-12 h-12 flex items-center justify-center bg-[var(--h-white)] rounded-xl text-[1.5rem] shadow-sm">
                                {badge.icon}
                            </div>
                            <div>
                                <div className="font-ui text-[1rem] font-bold text-[var(--text-primary)] mb-0.5">{badge.title}</div>
                                <div className="text-[0.8rem] text-[var(--text-secondary)]">{badge.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-8 text-center text-[0.85rem] text-[var(--text-secondary)]">Read consistently to unlock badges!</div>
            )}
        </div>
    );
}
