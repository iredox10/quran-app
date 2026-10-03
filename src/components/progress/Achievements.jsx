import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { computeAchievementStats, evaluateAchievements, orderBadges } from '../../utils/achievements';

const SEEN_KEY = 'quran-nur-achv-seen';
const COLLAPSED_COUNT = 4;

function readSeen() {
    try {
        const parsed = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // localStorage unavailable (private mode) — pretend nothing was seen yet
        return [];
    }
}

function writeSeen(ids) {
    try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...new Set(ids)]));
    } catch {
        // celebrations are best-effort; never break the card over storage
    }
}

function celebrateBadge() {
    confetti({
        particleCount: 90,
        spread: 65,
        startVelocity: 38,
        ticks: 220,
        origin: { y: 0.65 },
        colors: ['#2E4F4A', '#B8924A', '#10b981', '#3b82f6'],
        disableForReducedMotion: true,
    });
}

const formatCount = (n) => (n >= 1000 ? n.toLocaleString('en-US') : String(n));

export default function Achievements() {
    const { readingSessions, recentlyRead } = useAppStore();
    const sessions = readingSessions || [];

    const [expanded, setExpanded] = useState(false);
    const celebratedRef = useRef(false);

    const stats = useMemo(
        () => computeAchievementStats(sessions, recentlyRead || []),
        [sessions, recentlyRead],
    );
    const badges = useMemo(() => evaluateAchievements(stats), [stats]);
    const ordered = useMemo(() => orderBadges(badges), [badges]);

    const unlockedCount = useMemo(() => badges.filter((b) => b.unlocked).length, [badges]);
    const hasSessions = stats.sessionCount > 0;
    const visible = expanded ? ordered : ordered.slice(0, COLLAPSED_COUNT);

    // One celebration per mount, for a badge the user just unlocked today.
    useEffect(() => {
        if (celebratedRef.current) return;
        celebratedRef.current = true;
        if (stats.sessionCount === 0) return;

        const seen = readSeen();
        const seenSet = new Set(seen);
        const fresh = ordered.some((b) => b.unlocked && !seenSet.has(b.id));
        const unlockedIds = badges.filter((b) => b.unlocked).map((b) => b.id);
        // Fold every unlock into the seen list so old badges never re-celebrate.
        writeSeen([...seen, ...unlockedIds]);

        if (fresh && stats.todaySessions > 1) celebrateBadge();
    }, [badges, ordered, stats]);

    return (
        <div className="rounded-[24px] border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-cream)] p-6">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 font-ui text-[1.15rem] font-bold text-[var(--text-primary)]">
                    <Award size={18} className="text-[var(--accent-primary)]" /> Achievements
                </div>
                <span className="px-3 py-1 rounded-full bg-[var(--bg-surface)] font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)]">
                    {unlockedCount} / {badges.length}
                </span>
            </div>
            {!hasSessions ? (
                <div className="py-8 text-center text-[0.85rem] text-[var(--text-secondary)]">Read consistently to unlock badges!</div>
            ) : (
                <>
                    <div className="grid gap-3">
                        {visible.map((badge) => (badge.unlocked ? (
                            <div key={badge.id} className="flex items-center gap-4 p-3 rounded-[16px] bg-[var(--h-white)] border-[1.5px] border-[var(--h-bone-dark)] transition-all hover:bg-[var(--h-bone)] hover:border-[var(--accent-hover)]">
                                <div className="w-12 h-12 flex items-center justify-center bg-[var(--h-white)] rounded-xl text-[1.5rem] shadow-sm">
                                    {badge.icon}
                                </div>
                                <div>
                                    <div className="font-ui text-[1rem] font-bold text-[var(--text-primary)] mb-0.5">{badge.title}</div>
                                    <div className="text-[0.8rem] text-[var(--text-secondary)]">{badge.desc}</div>
                                </div>
                            </div>
                        ) : (
                            <div key={badge.id} className="flex items-center gap-4 p-3 rounded-[16px] bg-[var(--h-white)] border-[1.5px] border-[var(--h-bone-dark)] opacity-70">
                                <div className="w-12 h-12 flex items-center justify-center bg-[var(--h-white)] rounded-xl text-[1.5rem] shadow-sm saturate-0 opacity-60">
                                    {badge.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <div className="font-ui text-[1rem] font-bold text-[var(--text-primary)] mb-0.5">{badge.title}</div>
                                        <div className="font-mono text-[0.6rem] text-[var(--text-secondary)] whitespace-nowrap">
                                            {formatCount(Math.round(badge.current))} / {formatCount(badge.target)}
                                        </div>
                                    </div>
                                    <div className="text-[0.8rem] text-[var(--text-secondary)] mb-1.5">{badge.desc}</div>
                                    <div className="h-1.5 rounded-full bg-[var(--bg-surface)] overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500"
                                            style={{ width: `${Math.round(badge.progress * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )))}
                    </div>
                    {ordered.length > COLLAPSED_COUNT && (
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            className="mt-4 w-full py-2 rounded-full border-[1.5px] border-[var(--h-bone-dark)] bg-[var(--h-white)] font-mono text-[0.6rem] uppercase tracking-widest text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:border-[var(--accent-hover)]"
                        >
                            {expanded ? 'Show less' : 'Show all'}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
