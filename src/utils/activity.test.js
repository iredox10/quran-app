import { describe, it, expect } from 'vitest';
import {
    dateKey,
    addDays,
    lastNDayKeys,
    weekKeys,
    monthKeys,
    rangeKeys,
    previousRangeKeys,
    filterByRange,
    bucketByDay,
    bucketByHour,
    bucketByWeek,
    summarize,
    deltaPercent,
    formatDuration,
    rangeTitle,
    keyToDate,
} from './activity';

const NOW = new Date('2026-10-03T15:00:00.000Z'); // a Saturday
const session = (date, duration, type = 'reading', extra = {}) => ({ date, duration, type, timestamp: keyToDate(date).getTime(), ...extra });

describe('date keys', () => {
    it('formats UTC date keys', () => {
        expect(dateKey(new Date('2026-10-03T23:59:59Z'))).toBe('2026-10-03');
    });

    it('shifts keys across month boundaries', () => {
        expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('returns the last N days oldest first', () => {
        expect(lastNDayKeys(3, '2026-10-03')).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
    });
});

describe('ranges', () => {
    it('builds the current week starting Sunday', () => {
        const keys = weekKeys(NOW);
        expect(keys).toHaveLength(7);
        expect(keys[0]).toBe('2026-09-27'); // Sunday
        expect(keys[6]).toBe('2026-10-03'); // Saturday (today)
    });

    it('builds the current calendar month', () => {
        const keys = monthKeys(NOW);
        expect(keys).toHaveLength(31);
        expect(keys[0]).toBe('2026-10-01');
        expect(keys[30]).toBe('2026-10-31');
    });

    it('resolves today / yesterday / all', () => {
        expect(rangeKeys('today', NOW)).toEqual(['2026-10-03']);
        expect(rangeKeys('yesterday', NOW)).toEqual(['2026-10-02']);
        expect(rangeKeys('all', NOW)).toBeNull();
    });

    it('previous range is the same length immediately before', () => {
        const prev = previousRangeKeys('today', NOW);
        expect(prev).toEqual(['2026-10-02']);
        const prevWeek = previousRangeKeys('week', NOW);
        expect(prevWeek).toHaveLength(7);
        expect(prevWeek[6]).toBe('2026-09-26');
    });

    it('filters sessions by range', () => {
        const sessions = [session('2026-10-03', 600), session('2026-10-02', 300), session('2026-09-01', 60)];
        expect(filterByRange(sessions, 'today', NOW)).toHaveLength(1);
        expect(filterByRange(sessions, 'week', NOW)).toHaveLength(2);
        expect(filterByRange(sessions, 'all', NOW)).toHaveLength(3);
    });
});

describe('buckets', () => {
    it('buckets by day with labels and totals', () => {
        const sessions = [session('2026-10-03', 600), session('2026-10-03', 300), session('2026-10-02', 60)];
        const buckets = bucketByDay(sessions, ['2026-10-02', '2026-10-03']);
        expect(buckets).toHaveLength(2);
        expect(buckets[1].seconds).toBe(900);
        expect(buckets[1].minutes).toBe(15);
        expect(buckets[1].count).toBe(2);
        expect(buckets[0].name).toBe('Fri');
        expect(buckets[1].name).toBe('Sat');
    });

    it('buckets by local hour for a single day', () => {
        const s = { ...session('2026-10-03', 600), timestamp: new Date('2026-10-03T21:30:00').getTime() };
        const buckets = bucketByHour([s], '2026-10-03');
        expect(buckets).toHaveLength(24);
        expect(buckets[21].seconds).toBe(600);
        expect(buckets.reduce((sum, b) => sum + b.seconds, 0)).toBe(600);
    });

    it('buckets by week', () => {
        // bucketByWeek only counts sessions whose date is inside `keys`.
        const sessions = [session('2026-10-03', 300), session('2026-10-12', 600), session('2026-09-28', 999)];
        const weeks = bucketByWeek(sessions, monthKeys(NOW));
        // Oct 1 (Thu) opens the week starting Sep 27, so October spans 5 week buckets.
        expect(weeks.length).toBe(5);
        expect(weeks[0].seconds).toBe(300); // week of Sep 27 (Oct 3 falls here)
        expect(weeks[2].seconds).toBe(600); // week of Oct 11
        expect(weeks[1].seconds).toBe(0);
    });
});

describe('summarize + deltas', () => {
    it('totals seconds, active days and per-type splits', () => {
        const sessions = [
            session('2026-10-03', 600, 'reading'),
            session('2026-10-03', 300, 'memorizing'),
            session('2026-10-02', 60, 'pomodoro'),
        ];
        const sum = summarize(sessions);
        expect(sum.seconds).toBe(960);
        expect(sum.minutes).toBe(16);
        expect(sum.activeDays).toBe(2);
        expect(sum.avgPerActiveDay).toBe(8);
        expect(sum.byType.reading).toBe(600);
        expect(sum.byType.pomodoro).toBe(60);
    });

    it('computes percentage change', () => {
        expect(deltaPercent(150, 100)).toBe(50);
        expect(deltaPercent(50, 100)).toBe(-50);
        expect(deltaPercent(0, 0)).toBe(0);
        expect(deltaPercent(100, 0)).toBeNull();
    });
});

describe('formatting', () => {
    it('formats durations', () => {
        expect(formatDuration(0)).toBe('0m');
        expect(formatDuration(59 * 60)).toBe('59m');
        expect(formatDuration(60 * 60)).toBe('1h');
        expect(formatDuration(90 * 60)).toBe('1h 30m');
    });

    it('titles ranges', () => {
        expect(rangeTitle('today', NOW)).toBe('Oct 3');
        expect(rangeTitle('all', NOW)).toBe('All time');
        expect(rangeTitle('week', NOW)).toBe('Sep 27 – Oct 3');
    });
});
