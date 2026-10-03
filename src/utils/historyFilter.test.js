import { describe, it, expect } from 'vitest';
import {
    normalizeQuery,
    chapterNames,
    matchesQuery,
    filterSessions,
    sessionTime,
    dayLabel,
    groupSessionsByDay,
} from './historyFilter';
import { keyToDate } from './activity';

const NOW = new Date('2026-10-03T15:00:00.000Z'); // a Saturday
const session = (date, duration, type = 'reading', extra = {}) => ({
    date,
    duration,
    type,
    timestamp: keyToDate(date).getTime(),
    ...extra,
});

const CHAPTERS = [
    { id: 1, name_simple: 'Al-Fatihah', name_arabic: 'الفاتحة' },
    { id: 2, name_simple: 'Al-Baqarah', name_arabic: 'البقرة' },
];
const resolver = (id) => CHAPTERS.find((c) => String(c.id) === String(id)) || null;

describe('normalizeQuery / chapterNames', () => {
    it('trims and lowercases, empty defaults to ""', () => {
        expect(normalizeQuery('  FatihAH ')).toBe('fatihah');
        expect(normalizeQuery('')).toBe('');
        expect(normalizeQuery(undefined)).toBe('');
    });

    it('extracts names from objects and strings', () => {
        expect(chapterNames(CHAPTERS[0])).toEqual(['Al-Fatihah', 'الفاتحة']);
        expect(chapterNames('Al-Ikhlas')).toEqual(['Al-Ikhlas']);
        expect(chapterNames(null)).toEqual([]);
    });
});

describe('matchesQuery', () => {
    it('matches everything on an empty query', () => {
        expect(matchesQuery(session('2026-10-03', 600, 'reading', { chapterId: 1 }), '', resolver)).toBe(true);
        expect(matchesQuery(session('2026-10-03', 600, 'reading'), '   ', resolver)).toBe(true);
    });

    it('matches by activity type id and label, case-insensitively', () => {
        const focus = session('2026-10-03', 600, 'pomodoro');
        expect(matchesQuery(focus, 'POMODORO', resolver)).toBe(true);
        expect(matchesQuery(focus, 'focus', resolver)).toBe(true);
        expect(matchesQuery(focus, 'reading', resolver)).toBe(false);

        expect(matchesQuery(session('2026-10-03', 60, 'listening'), 'listen', resolver)).toBe(true);
        expect(matchesQuery(session('2026-10-03', 60, 'memorizing'), 'memoriz', resolver)).toBe(true);
    });

    it('matches surah names via the resolver (simple + arabic)', () => {
        const s = session('2026-10-03', 600, 'reading', { chapterId: 1 });
        expect(matchesQuery(s, 'fatihah', resolver)).toBe(true);
        expect(matchesQuery(s, 'AL-FATIHAH', resolver)).toBe(true);
        expect(matchesQuery(s, 'الفاتحة', resolver)).toBe(true);
        expect(matchesQuery(s, 'baqarah', resolver)).toBe(false);
    });

    it('matches "surah {id}" when the resolver misses or is absent', () => {
        const s = session('2026-10-03', 600, 'reading', { chapterId: 114 });
        expect(matchesQuery(s, 'surah 114', resolver)).toBe(true);
        expect(matchesQuery(s, '114', resolver)).toBe(true);
        expect(matchesQuery(s, 'surah 114', null)).toBe(true);
    });

    it('never matches a surah query when the session has no chapterId', () => {
        const s = session('2026-10-03', 600, 'reading', { chapterId: null });
        expect(matchesQuery(s, 'fatihah', resolver)).toBe(false);
        expect(matchesQuery(s, 'surah', resolver)).toBe(false);
    });
});

describe('filterSessions', () => {
    const sessions = [
        session('2026-10-03', 600, 'reading', { chapterId: 1 }),
        session('2026-10-03', 300, 'pomodoro'),
        session('2026-10-02', 120, 'memorizing', { chapterId: 2 }),
        session('2026-09-01', 60, 'listening', { chapterId: 1 }),
    ];

    it('filters by range', () => {
        expect(filterSessions(sessions, { range: 'today', now: NOW })).toHaveLength(2);
        expect(filterSessions(sessions, { range: 'yesterday', now: NOW })).toHaveLength(1);
        expect(filterSessions(sessions, { range: 'all', now: NOW })).toHaveLength(4);
    });

    it('filters by query within a range', () => {
        const result = filterSessions(sessions, { range: 'all', query: 'baqarah', chapterNameResolver: resolver, now: NOW });
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('memorizing');
    });

    it('combines type query with range', () => {
        const result = filterSessions(sessions, { range: 'today', query: 'focus', now: NOW });
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('pomodoro');
    });

    it('returns [] when nothing matches', () => {
        expect(filterSessions(sessions, { range: 'today', query: 'zzz', chapterNameResolver: resolver, now: NOW })).toEqual([]);
        expect(filterSessions([], { range: 'all', now: NOW })).toEqual([]);
    });

    it('defaults to all-time with no query', () => {
        expect(filterSessions(sessions, { now: NOW })).toHaveLength(4);
    });
});

describe('sessionTime / dayLabel', () => {
    it('prefers timestamp, falls back to date', () => {
        expect(sessionTime({ date: '2026-10-03', timestamp: 42 })).toBe(42);
        expect(sessionTime({ date: '2026-10-03' })).toBe(keyToDate('2026-10-03').getTime());
        expect(sessionTime({})).toBe(0);
    });

    it('labels today/yesterday relatively and other days by weekday+date', () => {
        expect(dayLabel('2026-10-03', NOW)).toBe('Today');
        expect(dayLabel('2026-10-02', NOW)).toBe('Yesterday');
        expect(dayLabel('2026-10-05', NOW)).toBe('Mon, Oct 5');
        expect(dayLabel('2026-09-30', NOW)).toBe('Wed, Sep 30');
    });
});

describe('groupSessionsByDay', () => {
    it('groups by day, newest day first, sessions newest first', () => {
        const early = session('2026-10-03', 100, 'reading', { timestamp: 1000 });
        const late = session('2026-10-03', 200, 'memorizing', { timestamp: 9000 });
        const older = session('2026-10-02', 300, 'pomodoro', { timestamp: 5000 });
        const groups = groupSessionsByDay([early, late, older], NOW);

        expect(groups.map((g) => g.key)).toEqual(['2026-10-03', '2026-10-02']);
        expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday']);
        expect(groups[0].sessions.map((s) => s.type)).toEqual(['memorizing', 'reading']);
        expect(groups[0].totalSeconds).toBe(300);
        expect(groups[1].totalSeconds).toBe(300);
    });

    it('returns [] for no sessions', () => {
        expect(groupSessionsByDay([], NOW)).toEqual([]);
    });
});
