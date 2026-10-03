import { describe, it, expect } from 'vitest';
import {
    ACHIEVEMENT_CATALOG,
    TOTAL_SURAHS,
    computeAchievementStats,
    evaluateAchievements,
    currentStreak,
    orderBadges,
} from './achievements';
import { addDays } from './activity';

const NOW = new Date('2026-10-03T12:00:00.000Z'); // a Saturday
const TODAY = '2026-10-03';

const day = (offset) => addDays(TODAY, -offset);
const session = (date, duration = 600, type = 'reading', chapterId = null) => ({
    date,
    duration,
    type,
    chapterId,
    timestamp: Date.parse(`${date}T12:00:00.000Z`),
});
const byId = (badges, id) => badges.find((b) => b.id === id);
const statsOf = (sessions, recentlyRead = []) => computeAchievementStats(sessions, recentlyRead, NOW);

describe('catalog', () => {
    it('has unique ids and stable order', () => {
        expect(ACHIEVEMENT_CATALOG.length).toBeGreaterThanOrEqual(16);
        expect(ACHIEVEMENT_CATALOG.length).toBeLessThanOrEqual(20);
        const ids = ACHIEVEMENT_CATALOG.map((b) => b.id);
        expect(new Set(ids).size).toBe(ids.length);
        const again = ACHIEVEMENT_CATALOG.map((b) => b.id);
        expect(again).toEqual(ids);
    });

    it('returns stable ids, order and shape from evaluateAchievements', () => {
        const sessions = [session(TODAY, 600, 'reading', 1), session(day(1), 300, 'memorizing', 2)];
        const first = evaluateAchievements(statsOf(sessions));
        const second = evaluateAchievements(statsOf(sessions));
        expect(first.map((b) => b.id)).toEqual(second.map((b) => b.id));
        expect(first.map((b) => b.id)).toEqual(ACHIEVEMENT_CATALOG.map((b) => b.id));
        expect(first).toEqual(second);
        first.forEach((b) => {
            expect(Object.keys(b)).toEqual(['id', 'icon', 'title', 'desc', 'unlocked', 'current', 'target', 'progress']);
            expect(typeof b.unlocked).toBe('boolean');
        });
    });
});

describe('no data', () => {
    it('unlocks nothing and reports zero progress', () => {
        const badges = evaluateAchievements(statsOf([]));
        expect(badges.every((b) => b.unlocked === false)).toBe(true);
        expect(badges.every((b) => b.progress === 0)).toBe(true);
        expect(badges.every((b) => b.current === 0)).toBe(true);
    });

    it('tolerates missing/undefined stats', () => {
        const badges = evaluateAchievements(undefined);
        expect(badges).toHaveLength(ACHIEVEMENT_CATALOG.length);
        expect(badges.every((b) => b.unlocked === false && b.progress === 0)).toBe(true);
    });
});

describe('streak thresholds', () => {
    it('unlocks streak-3 at three consecutive days but not streak-7', () => {
        const sessions = [session(TODAY), session(day(1)), session(day(2))];
        const badges = evaluateAchievements(statsOf(sessions));
        expect(byId(badges, 'streak-3').unlocked).toBe(true);
        expect(byId(badges, 'streak-7').unlocked).toBe(false);
        expect(byId(badges, 'streak-7').current).toBe(3);
        expect(byId(badges, 'streak-7').progress).toBeCloseTo(3 / 7, 5);
        expect(byId(badges, 'streak-14').unlocked).toBe(false);
        expect(byId(badges, 'streak-30').unlocked).toBe(false);
        expect(byId(badges, 'streak-100').unlocked).toBe(false);
    });

    it('unlocks streak-7 exactly at seven days', () => {
        const sessions = Array.from({ length: 7 }, (_, i) => session(day(i)));
        const badges = evaluateAchievements(statsOf(sessions));
        expect(byId(badges, 'streak-7').unlocked).toBe(true);
        expect(byId(badges, 'streak-7').current).toBe(7);
        expect(byId(badges, 'streak-14').unlocked).toBe(false);
    });

    it('grants grace for an empty today but breaks on an earlier gap', () => {
        // yesterday + day before only → an empty today does not reset the streak
        expect(currentStreak([day(1), day(2)], NOW)).toBe(2);
        // today + a gap on day 1 → only today counts
        expect(currentStreak([TODAY, day(2)], NOW)).toBe(1);
        expect(currentStreak([], NOW)).toBe(0);
        // a 3-day run that ends yesterday still unlocks the 3-day badge
        const badges = evaluateAchievements(statsOf([session(day(1)), session(day(2)), session(day(3))]));
        expect(byId(badges, 'streak-3').unlocked).toBe(true);
    });
});

describe('minutes thresholds', () => {
    it('unlocks minute milestones at the exact target', () => {
        const at100 = evaluateAchievements(statsOf([session(TODAY, 100 * 60)]));
        expect(byId(at100, 'minutes-100').unlocked).toBe(true);
        expect(byId(at100, 'minutes-100').current).toBe(100);

        const justUnder = evaluateAchievements(statsOf([session(TODAY, 99 * 60)]));
        expect(byId(justUnder, 'minutes-100').unlocked).toBe(false);
        expect(byId(justUnder, 'minutes-100').current).toBe(99);
        expect(byId(justUnder, 'minutes-100').progress).toBeCloseTo(0.99, 5);
    });

    it('counts minutes per activity type', () => {
        const sessions = [
            session(TODAY, 60 * 60, 'memorizing'),
            session(TODAY, 30 * 60, 'listening'),
            session(TODAY, 5 * 60, 'pomodoro'),
        ];
        const stats = statsOf(sessions);
        expect(stats.memorizingMinutes).toBe(60);
        expect(stats.listeningMinutes).toBe(30);
        expect(stats.focusMinutes).toBe(5);
        expect(stats.totalMinutes).toBe(95);

        const badges = evaluateAchievements(stats);
        expect(byId(badges, 'memorize-500').unlocked).toBe(false);
        expect(byId(badges, 'listening-100').unlocked).toBe(false);
        expect(byId(badges, 'listening-100').current).toBe(30);
    });

    it('counts completed focus sessions', () => {
        const sessions = Array.from({ length: 10 }, (_, i) => session(day(i % 3), 1500, 'pomodoro'));
        const badges = evaluateAchievements(statsOf(sessions));
        expect(byId(badges, 'focus-10').unlocked).toBe(true);
        expect(byId(badges, 'focus-50').unlocked).toBe(false);
        expect(byId(badges, 'focus-50').current).toBe(10);
    });
});

describe('progress clamping', () => {
    it('clamps progress into 0..1 for overshoot', () => {
        const badges = evaluateAchievements(statsOf([session(TODAY, 6000 * 60)]));
        expect(byId(badges, 'minutes-100').current).toBe(6000);
        expect(byId(badges, 'minutes-100').progress).toBe(1);
        expect(byId(badges, 'minutes-5000').progress).toBe(1);
        badges.forEach((b) => {
            expect(b.progress).toBeGreaterThanOrEqual(0);
            expect(b.progress).toBeLessThanOrEqual(1);
        });
    });

    it('clamps negative and missing metrics to zero progress', () => {
        const badges = evaluateAchievements({ currentStreak: -5, totalMinutes: undefined });
        badges.forEach((b) => {
            expect(b.progress).toBe(0);
            expect(b.unlocked).toBe(false);
        });
    });
});

describe('khatm (all surahs)', () => {
    const surahSessions = (n) => Array.from({ length: n }, (_, i) => session(TODAY, 60, 'reading', i + 1));

    it('stays locked at 113 surahs', () => {
        const badges = evaluateAchievements(statsOf(surahSessions(113)));
        expect(byId(badges, 'khatm').unlocked).toBe(false);
        expect(byId(badges, 'khatm').current).toBe(113);
        expect(byId(badges, 'khatm').progress).toBeCloseTo(113 / 114, 5);
        expect(byId(badges, 'surahs-30').unlocked).toBe(true);
    });

    it('unlocks only at 114 surahs', () => {
        const badges = evaluateAchievements(statsOf(surahSessions(114)));
        expect(byId(badges, 'khatm').unlocked).toBe(true);
        expect(byId(badges, 'khatm').target).toBe(TOTAL_SURAHS);
        expect(byId(badges, 'khatm').progress).toBe(1);
    });

    it('counts chapters from sessions and recentlyRead together', () => {
        const sessions = [session(TODAY, 60, 'reading', 1), session(TODAY, 60, 'reading', 2)];
        const recent = [{ chapterId: 3 }, { chapterId: 1 }];
        expect(statsOf(sessions, recent).uniqueSurahs).toBe(3);
        expect(statsOf(sessions, []).uniqueSurahs).toBe(2);
    });
});

describe('active days + perfect week', () => {
    it('tracks distinct active days', () => {
        const sessions = [session(TODAY), session(TODAY, 300, 'memorizing'), session(day(3))];
        const stats = statsOf(sessions);
        expect(stats.activeDays).toBe(2);
        expect(stats.sessionCount).toBe(3);
        const badges = evaluateAchievements(stats);
        expect(byId(badges, 'active-7').current).toBe(2);
    });

    it('unlocks perfect week only when all last 7 days are active', () => {
        const full = Array.from({ length: 7 }, (_, i) => session(day(i)));
        expect(byId(evaluateAchievements(statsOf(full)), 'perfect-week').unlocked).toBe(true);

        const missingToday = Array.from({ length: 6 }, (_, i) => session(day(i + 1)));
        const badge = byId(evaluateAchievements(statsOf(missingToday)), 'perfect-week');
        expect(badge.unlocked).toBe(false);
        expect(badge.current).toBe(6);
        expect(badge.progress).toBeCloseTo(6 / 7, 5);
    });
});

describe('robustness', () => {
    it('tolerates null / missing inputs', () => {
        const stats = computeAchievementStats(null, undefined, NOW);
        expect(stats.sessionCount).toBe(0);
        expect(stats.uniqueSurahs).toBe(0);
        expect(stats.currentStreak).toBe(0);
        expect(evaluateAchievements(stats).every((b) => b.unlocked === false)).toBe(true);
    });

    it('accepts a Set of active dates in currentStreak', () => {
        expect(currentStreak(new Set([TODAY, day(1)]), NOW)).toBe(2);
        expect(currentStreak(new Set(), NOW)).toBe(0);
    });

    it('ignores sessions without a valid duration for minutes', () => {
        const stats = computeAchievementStats([
            { date: TODAY, duration: null, type: 'reading', chapterId: 1 },
            { date: TODAY, duration: 'not-a-number', type: 'listening' },
            { date: TODAY, duration: 60, type: 'pomodoro' },
        ], [], NOW);
        expect(stats.totalMinutes).toBe(1);
        expect(stats.focusMinutes).toBe(1);
        expect(stats.activeDays).toBe(1);
        expect(stats.uniqueSurahs).toBe(1);
    });
});

describe('orderBadges', () => {
    it('puts unlocked first (highest milestone first) and locked by progress', () => {
        const sessions = [session(TODAY), session(day(1)), session(day(2))];
        const ordered = orderBadges(evaluateAchievements(statsOf(sessions)));
        const unlocked = ordered.filter((b) => b.unlocked);
        const locked = ordered.filter((b) => !b.unlocked);
        expect(ordered).toHaveLength(ACHIEVEMENT_CATALOG.length);
        expect(ordered.slice(0, unlocked.length).every((b) => b.unlocked)).toBe(true);
        expect(ordered.slice(unlocked.length).every((b) => !b.unlocked)).toBe(true);
        // newest unlocked (bigger target) comes first within the unlocked run
        expect(unlocked[0].id).toBe('streak-3');
        // locked sorted by progress descending
        const progressValues = locked.map((b) => b.progress);
        expect([...progressValues].sort((a, b) => b - a)).toEqual(progressValues);
    });
});
