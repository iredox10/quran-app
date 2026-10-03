/**
 * achievements.js — the pure achievement engine behind the Progress page
 * "Achievements" card.
 *
 * Everything here is framework-free: `computeAchievementStats` derives every
 * number a badge needs from raw sessions + recently-read chapters, and
 * `evaluateAchievements` turns that snapshot into badge objects. No React, no
 * Date.now() unless a `now` default is used — tests inject a fixed date.
 *
 * Badge shape returned by `evaluateAchievements`:
 *   { id, icon, title, desc, unlocked, current, target, progress }
 * where `progress` is clamped to 0..1 and `unlocked === current >= target`.
 */

import { dateKey, addDays, lastNDayKeys } from './activity';

export const TOTAL_SURAHS = 114;

/** Fixed catalog order — stable across calls so ids/order are predictable. */
export const ACHIEVEMENT_CATALOG = [
    // Streaks (counting back from today, today may be empty)
    { id: 'streak-3', icon: '🔥', title: 'Kindled', desc: 'Active 3 days in a row.', metric: 'currentStreak', target: 3 },
    { id: 'streak-7', icon: '🔥', title: 'Steady Flame', desc: 'A full week without a gap.', metric: 'currentStreak', target: 7 },
    { id: 'streak-14', icon: '🔥', title: 'Two Weeks of Light', desc: '14 days unbroken.', metric: 'currentStreak', target: 14 },
    { id: 'streak-30', icon: '🔥', title: 'A Month Steadfast', desc: '30 consecutive days in the Quran.', metric: 'currentStreak', target: 30 },
    { id: 'streak-100', icon: '🔥', title: 'Hundred Days of Nur', desc: '100 days without slipping.', metric: 'currentStreak', target: 100 },

    // Total minutes across every activity type
    { id: 'minutes-100', icon: '⏱️', title: 'First 100 Minutes', desc: '100 minutes of quiet effort.', metric: 'totalMinutes', target: 100 },
    { id: 'minutes-500', icon: '⏱️', title: '500 Minutes', desc: 'A real habit taking root.', metric: 'totalMinutes', target: 500 },
    { id: 'minutes-1000', icon: '⏱️', title: '1,000 Minutes', desc: 'Over 16 hours with the Book.', metric: 'totalMinutes', target: 1000 },
    { id: 'minutes-5000', icon: '⏱️', title: '5,000 Minutes', desc: 'A deep well of time invested.', metric: 'totalMinutes', target: 5000 },

    // Surahs explored
    { id: 'surahs-5', icon: '🗺️', title: 'Curious Traveler', desc: 'Opened 5 different surahs.', metric: 'uniqueSurahs', target: 5 },
    { id: 'surahs-30', icon: '🗺️', title: 'Many Paths', desc: 'Explored 30 different surahs.', metric: 'uniqueSurahs', target: 30 },
    { id: 'khatm', icon: '👑', title: 'Khatm', desc: 'All 114 surahs — a complete journey.', metric: 'uniqueSurahs', target: TOTAL_SURAHS },

    // Activity-type milestones
    { id: 'memorize-500', icon: '📖', title: 'Carried in the Heart', desc: '500 minutes of memorization.', metric: 'memorizingMinutes', target: 500 },
    { id: 'listening-100', icon: '🎧', title: 'Listening Ears', desc: '100 minutes of recitation listened to.', metric: 'listeningMinutes', target: 100 },
    { id: 'focus-10', icon: '🎯', title: 'Deep Focus', desc: '10 focus sessions completed.', metric: 'focusSessions', target: 10 },
    { id: 'focus-50', icon: '🎯', title: 'Unshaken Attention', desc: '50 focus sessions completed.', metric: 'focusSessions', target: 50 },

    // Active days
    { id: 'active-7', icon: '📅', title: 'Seven Days Present', desc: 'Active on 7 different days.', metric: 'activeDays', target: 7 },
    { id: 'active-30', icon: '📅', title: 'Regular Rhythm', desc: 'Active on 30 different days.', metric: 'activeDays', target: 30 },
    { id: 'active-100', icon: '📅', title: 'Centurion of Days', desc: 'Active on 100 different days.', metric: 'activeDays', target: 100 },
    { id: 'perfect-week', icon: '🌟', title: 'Perfect Week', desc: 'Active every day for the last 7 days.', metric: 'activeDaysLast7', target: 7 },
];

const METRICS = {
    currentStreak: (s) => s.currentStreak,
    totalMinutes: (s) => s.totalMinutes,
    uniqueSurahs: (s) => s.uniqueSurahs,
    memorizingMinutes: (s) => s.memorizingMinutes,
    listeningMinutes: (s) => s.listeningMinutes,
    focusSessions: (s) => s.focusSessions,
    activeDays: (s) => s.activeDays,
    activeDaysLast7: (s) => s.activeDaysLast7,
};

const toSeconds = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Current streak: consecutive active days counting back from `now`.
 * Mirrors the Progress page — an empty today does not break the streak
 * (grace for a day still in progress), but any earlier gap does.
 */
export function currentStreak(activeDates, now = new Date()) {
    const set = activeDates instanceof Set ? activeDates : new Set(activeDates);
    if (set.size === 0) return 0;
    let streak = 0;
    let key = dateKey(now);
    for (let i = 0; i < 365; i++) {
        if (set.has(key)) {
            streak++;
        } else if (i > 0) {
            break;
        }
        key = addDays(key, -1);
    }
    return streak;
}

/**
 * Derive every number an achievement needs from raw app data.
 *
 * @param {Array} sessions   `readingSessions` — { date, duration (seconds), type, chapterId, timestamp }
 * @param {Array} recentlyRead `recentlyRead` — { chapterId, ... }
 * @param {Date}  now        reference date (injectable for tests)
 */
export function computeAchievementStats(sessions = [], recentlyRead = [], now = new Date()) {
    const list = Array.isArray(sessions) ? sessions : [];
    const recent = Array.isArray(recentlyRead) ? recentlyRead : [];

    const activeDates = new Set();
    const surahIds = new Set();
    const typeSeconds = { reading: 0, memorizing: 0, listening: 0, pomodoro: 0 };
    const todayKey = dateKey(now);

    let totalSeconds = 0;
    let focusSessions = 0;
    let todaySessions = 0;

    list.forEach((s) => {
        if (!s) return;
        const seconds = toSeconds(s.duration);
        totalSeconds += seconds;
        if (typeSeconds[s.type] !== undefined) typeSeconds[s.type] += seconds;
        if (s.type === 'pomodoro') focusSessions += 1;
        if (s.date) {
            activeDates.add(s.date);
            if (s.date === todayKey) todaySessions += 1;
        }
        const chapterId = Number(s.chapterId);
        if (Number.isFinite(chapterId) && chapterId > 0) surahIds.add(chapterId);
    });

    recent.forEach((r) => {
        const chapterId = Number(r && r.chapterId);
        if (Number.isFinite(chapterId) && chapterId > 0) surahIds.add(chapterId);
    });

    const last7 = lastNDayKeys(7, todayKey);
    let activeDaysLast7 = 0;
    last7.forEach((key) => { if (activeDates.has(key)) activeDaysLast7 += 1; });

    const mins = (seconds) => Math.round(seconds / 60);

    return {
        totalSeconds,
        totalMinutes: mins(totalSeconds),
        sessionCount: list.length,
        activeDays: activeDates.size,
        activeDaysLast7,
        currentStreak: currentStreak(activeDates, now),
        readingMinutes: mins(typeSeconds.reading),
        memorizingMinutes: mins(typeSeconds.memorizing),
        listeningMinutes: mins(typeSeconds.listening),
        focusMinutes: mins(typeSeconds.pomodoro),
        focusSessions,
        uniqueSurahs: surahIds.size,
        todaySessions,
    };
}

/** Evaluate the catalog against a stats snapshot → badge objects (catalog order). */
export function evaluateAchievements(stats = {}) {
    return ACHIEVEMENT_CATALOG.map((badge) => {
        const read = METRICS[badge.metric];
        const raw = read ? read(stats) : 0;
        const current = Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : 0;
        const target = badge.target;
        const progress = target > 0 ? Math.min(1, Math.max(0, current / target)) : 0;
        return {
            id: badge.id,
            icon: badge.icon,
            title: badge.title,
            desc: badge.desc,
            unlocked: current >= target,
            current,
            target,
            progress,
        };
    });
}

/**
 * Display order for the card: unlocked first (highest milestone first, which
 * is the most-recently unlocked), then locked badges by progress — so the
 * collapsed "first few" always show what matters most.
 */
export function orderBadges(badges = []) {
    const unlocked = badges.filter((b) => b.unlocked).reverse();
    const locked = badges.filter((b) => !b.unlocked)
        .sort((a, b) => b.progress - a.progress || a.target - b.target);
    return [...unlocked, ...locked];
}
