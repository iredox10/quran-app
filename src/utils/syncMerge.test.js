import { describe, it, expect } from 'vitest';
import { mergeStateInto, slimStatePayload } from './syncMerge';

describe('mergeStateInto', () => {
    it('unions bookmarks by verseKey without duplicates', () => {
        const base = { bookmarks: [{ verseKey: '2:1', surahName: 'Al-Baqarah', chapterId: 2 }] };
        const incoming = {
            bookmarks: [
                { verseKey: '2:1', surahName: 'Al-Baqarah', chapterId: 2 },
                { verseKey: '18:1', surahName: 'Al-Kahf', chapterId: 18 },
            ],
        };
        const merged = mergeStateInto(base, incoming);
        expect(merged.bookmarks).toHaveLength(2);
        expect(merged.bookmarks.map(b => b.verseKey)).toEqual(['2:1', '18:1']);
    });

    it('keeps the latest recentlyRead entry per chapter, sorted, capped at 5', () => {
        const base = { recentlyRead: [{ chapterId: 1, chapterName: 'Al-Fatihah', verseKey: '1:1', timestamp: 100 }] };
        const incoming = {
            recentlyRead: [
                { chapterId: 1, chapterName: 'Al-Fatihah', verseKey: '1:5', timestamp: 300 },
                { chapterId: 18, chapterName: 'Al-Kahf', verseKey: '18:1', timestamp: 200 },
                { chapterId: 2, chapterName: 'Al-Baqarah', verseKey: '2:1', timestamp: 150 },
                { chapterId: 3, chapterName: 'Aal-Imran', verseKey: '3:1', timestamp: 140 },
                { chapterId: 4, chapterName: 'An-Nisa', verseKey: '4:1', timestamp: 130 },
            ],
        };
        const merged = mergeStateInto(base, incoming);
        expect(merged.recentlyRead).toHaveLength(5);
        const ch1 = merged.recentlyRead.find(r => r.chapterId === 1);
        expect(ch1.verseKey).toBe('1:5');
        expect(merged.recentlyRead[0].chapterId).toBe(1);
    });

    it('unions readingSessions by timestamp', () => {
        const base = { readingSessions: [{ date: '2026-01-01', duration: 60, type: 'reading', timestamp: 1 }] };
        const incoming = {
            readingSessions: [
                { date: '2026-01-01', duration: 60, type: 'reading', timestamp: 1 },
                { date: '2026-01-02', duration: 120, type: 'reading', timestamp: 2 },
            ],
        };
        const merged = mergeStateInto(base, incoming);
        expect(merged.readingSessions).toHaveLength(2);
    });

    it('lets incoming scalars win (last-writer-wins for settings)', () => {
        const merged = mergeStateInto(
            { theme: 'light', reciterId: 7, dailyReadingGoal: 20 },
            { theme: 'dark', reciterId: 5 }
        );
        expect(merged.theme).toBe('dark');
        expect(merged.reciterId).toBe(5);
        expect(merged.dailyReadingGoal).toBe(20);
    });

    it('deep-merges keyed maps like plannerReflections', () => {
        const base = {
            plannerReflections: {
                plan1: { 1: { text: 'a', createdAt: 'x' }, 2: { text: 'b', createdAt: 'y' } },
            },
        };
        const incoming = { plannerReflections: { plan1: { 2: { text: 'b2', createdAt: 'y2' } }, plan2: { 1: { text: 'c', createdAt: 'z' } } } };
        const merged = mergeStateInto(base, incoming);
        expect(merged.plannerReflections.plan1[1].text).toBe('a');
        expect(merged.plannerReflections.plan1[2].text).toBe('b2');
        expect(merged.plannerReflections.plan2[1].text).toBe('c');
    });

    it('takes the per-key max of pageVisitCounts from both devices', () => {
        const merged = mergeStateInto(
            { pageVisitCounts: { home: 5, library: 2 } },
            { pageVisitCounts: { home: 3, planner: 1 } }
        );
        expect(merged.pageVisitCounts).toEqual({ home: 5, library: 2, planner: 1 });
    });

    it('treats non-finite and negative pageVisitCounts as 0', () => {
        const merged = mergeStateInto(
            { pageVisitCounts: { home: -4, library: NaN, onlyBase: 6 } },
            { pageVisitCounts: { home: 3, library: 2 } }
        );
        expect(merged.pageVisitCounts).toEqual({ home: 3, library: 2, onlyBase: 6 });
    });

    it('unions collection items by verseKey', () => {
        const base = { collections: [{ id: 'c1', name: 'Favs', items: [{ verseKey: '2:1' }] }] };
        const incoming = { collections: [{ id: 'c1', name: 'Favs', items: [{ verseKey: '2:1' }, { verseKey: '18:1' }] }] };
        const merged = mergeStateInto(base, incoming);
        expect(merged.collections[0].items).toHaveLength(2);
    });

    it('merges planners by id, preserving completed days from both sides', () => {
        const base = { planners: [{ id: 'p1', completedDays: [1], assignmentProgress: { 1: 2 } }] };
        const incoming = { planners: [{ id: 'p1', completedDays: [2], assignmentProgress: { 2: 1 } }] };
        const merged = mergeStateInto(base, incoming);
        expect(merged.planners).toHaveLength(1);
        expect(merged.planners[0].completedDays).toEqual([1, 2]);
        expect(merged.planners[0].assignmentProgress[1]).toBe(2);
        expect(merged.planners[0].assignmentProgress[2]).toBe(1);
    });

    it('unions primitive arrays like completedTours', () => {
        const merged = mergeStateInto(
            { completedTours: ['planner-tour', 'memorize-tour'] },
            { completedTours: ['memorize-tour', 'sauka-tour'] }
        );
        expect(merged.completedTours).toEqual(expect.arrayContaining(['planner-tour', 'memorize-tour', 'sauka-tour']));
        expect(new Set(merged.completedTours).size).toBe(3);
    });

    it('handles missing base fields gracefully', () => {
        const merged = mergeStateInto({}, { bookmarks: [{ verseKey: '1:1' }], theme: 'dark' });
        expect(merged.bookmarks).toHaveLength(1);
        expect(merged.theme).toBe('dark');
    });

    it('merges top-level planner assignments by dayNumber, newest updatedAt wins', () => {
        const base = {
            planner: {
                id: 'p1',
                assignments: [
                    { dayNumber: 1, updatedAt: 100, text: 'base-newer' },
                    { dayNumber: 1, updatedAt: 50, text: 'base-dup' },
                    { dayNumber: 2, updatedAt: 10, text: 'base-older' },
                    { dayNumber: 4, updatedAt: 77, text: 'base-tie' },
                ],
            },
        };
        const incoming = {
            planner: {
                id: 'p1',
                assignments: [
                    { dayNumber: 1, updatedAt: 50, text: 'incoming-older' },
                    { dayNumber: 2, updatedAt: 999, text: 'incoming-newer' },
                    { dayNumber: 3, updatedAt: 5, text: 'incoming-only' },
                    { dayNumber: 4, updatedAt: 77, text: 'incoming-tie' },
                ],
            },
        };
        const merged = mergeStateInto(base, incoming);
        const assignments = merged.planner.assignments;
        expect(assignments).toHaveLength(4);
        const byDay = Object.fromEntries(assignments.map(a => [a.dayNumber, a]));
        expect(byDay[1].text).toBe('base-newer');
        expect(byDay[2].text).toBe('incoming-newer');
        expect(byDay[3].text).toBe('incoming-only');
        expect(byDay[4].text).toBe('incoming-tie');
    });

    it('merges assignments inside planners[] by dayNumber', () => {
        const base = {
            planners: [{ id: 'p1', assignments: [
                { dayNumber: 1, updatedAt: 100, text: 'base' },
                { dayNumber: 2, updatedAt: 5, text: 'day2' },
            ] }],
        };
        const incoming = {
            planners: [{ id: 'p1', assignments: [
                { dayNumber: 1, updatedAt: 200, text: 'incoming' },
                { dayNumber: 1, updatedAt: 1, text: 'incoming-dup' },
                { dayNumber: 3, updatedAt: 1, text: 'day3' },
            ] }],
        };
        const merged = mergeStateInto(base, incoming);
        expect(merged.planners).toHaveLength(1);
        const assignments = merged.planners[0].assignments;
        expect(assignments).toHaveLength(3);
        const byDay = Object.fromEntries(assignments.map(a => [a.dayNumber, a]));
        expect(byDay[1].updatedAt).toBe(200);
        expect(byDay[1].text).toBe('incoming');
        expect(byDay[2].updatedAt).toBe(5);
        expect(byDay[3].text).toBe('day3');
    });

    it('keeps JSON-identity behavior for arrays without dayNumber items', () => {
        const base = { planner: { id: 'p1', tags: [{ label: 'a' }, { label: 'b' }] } };
        const incoming = { planner: { id: 'p1', tags: [{ label: 'b' }, { label: 'c' }] } };
        const merged = mergeStateInto(base, incoming);
        expect(merged.planner.tags).toHaveLength(3);
    });

    it('derives planner from base planners matching activePlannerId', () => {
        const base = {
            planners: [{ id: 'p1', title: 'First' }, { id: 'p2', title: 'Second' }],
            activePlannerId: 'p2',
            planner: { id: 'p1', title: 'First' },
        };
        const merged = mergeStateInto(base, { theme: 'dark' });
        expect(merged.planner).toEqual({ id: 'p2', title: 'Second' });
        expect(merged.theme).toBe('dark');
    });

    it('derives planner from incoming planners with a different activePlannerId', () => {
        const base = {
            planners: [{ id: 'p1', title: 'First' }, { id: 'p2', title: 'Second' }],
            activePlannerId: 'p1',
            planner: { id: 'p1', title: 'First' },
        };
        const incoming = {
            planners: [{ id: 'p2', title: 'Second' }, { id: 'p3', title: 'Third' }],
            activePlannerId: 'p3',
        };
        const merged = mergeStateInto(base, incoming);
        expect(merged.activePlannerId).toBe('p3');
        expect(merged.planner).toEqual({ id: 'p3', title: 'Third' });
    });

    it('falls back to the planner entry matching the current planner id', () => {
        const base = {
            planners: [{ id: 'p1', title: 'First' }, { id: 'p2', title: 'Second' }],
            planner: { id: 'p2', title: 'Second' },
        };
        const merged = mergeStateInto(base, { activePlannerId: 'gone' });
        expect(merged.planner).toEqual({ id: 'p2', title: 'Second' });
    });
});

describe('slimStatePayload', () => {
    it('strips the top-level planner and keeps other fields', () => {
        const state = {
            theme: 'dark',
            planner: { id: 'p1', assignments: [{ dayNumber: 1, updatedAt: 1 }] },
            planners: [{ id: 'p1', assignments: [{ dayNumber: 1, updatedAt: 1 }] }],
            activePlannerId: 'p1',
        };
        const slimmed = slimStatePayload(state);
        expect(slimmed).not.toHaveProperty('planner');
        expect(slimmed).not.toBe(state);
        expect(slimmed.theme).toBe('dark');
        expect(slimmed.activePlannerId).toBe('p1');
        expect(slimmed.planners).toEqual([{ id: 'p1', assignments: [{ dayNumber: 1, updatedAt: 1 }] }]);
        expect(state).toHaveProperty('planner');
    });

    it('clamps pageVisitCounts into [0, 10000] and drops non-numeric keys', () => {
        const state = { pageVisitCounts: { home: 3.4e42, bad: 'nope', neg: -5, ok: 42 } };
        const slimmed = slimStatePayload(state);
        expect(slimmed.pageVisitCounts).toEqual({ home: 10000, neg: 0, ok: 42 });
        expect(state.pageVisitCounts).toEqual({ home: 3.4e42, bad: 'nope', neg: -5, ok: 42 });
    });

    it('dedupes assignments by dayNumber in planners and archivedPlanners', () => {
        const state = {
            planners: [{ id: 'p1', assignments: [
                { dayNumber: 1, updatedAt: 100, tag: 'newer' },
                { dayNumber: 1, updatedAt: 50, tag: 'older' },
                { dayNumber: 2, updatedAt: 10, tag: 'first-tie' },
                { dayNumber: 2, updatedAt: 10, tag: 'second-tie' },
            ] }],
            archivedPlanners: [{ id: 'old', assignments: [
                { dayNumber: 1, updatedAt: 5, tag: 'a' },
                { dayNumber: 1, updatedAt: 9, tag: 'b' },
            ] }],
        };
        const slimmed = slimStatePayload(state);
        expect(slimmed.planners[0].assignments).toEqual([
            { dayNumber: 1, updatedAt: 100, tag: 'newer' },
            { dayNumber: 2, updatedAt: 10, tag: 'first-tie' },
        ]);
        expect(slimmed.archivedPlanners[0].assignments).toEqual([
            { dayNumber: 1, updatedAt: 9, tag: 'b' },
        ]);
        expect(state.planners[0].assignments).toHaveLength(4);
        expect(state.archivedPlanners[0].assignments).toHaveLength(2);
    });

    it('does not mutate the input state', () => {
        const state = {
            theme: 'light',
            planner: { id: 'p1', assignments: [{ dayNumber: 1, updatedAt: 5 }] },
            pageVisitCounts: { home: 3.4e42 },
            planners: [{ id: 'p1', assignments: [{ dayNumber: 1, updatedAt: 5 }, { dayNumber: 1, updatedAt: 9 }] }],
            bookmarks: [{ verseKey: '2:1' }],
        };
        const snapshot = JSON.parse(JSON.stringify(state));
        const slimmed = slimStatePayload(state);
        expect(state).toEqual(snapshot);
        expect(slimmed).not.toBe(state);
        expect(slimmed.planners).not.toBe(state.planners);
    });

    it('trims readingSessions and pomodoroHistory to the last 100 when oversized', () => {
        const filler = 'x'.repeat(600);
        const state = {
            readingSessions: Array.from({ length: 2000 }, (_, i) => ({ timestamp: i, note: filler })),
            pomodoroHistory: Array.from({ length: 2000 }, (_, i) => ({ completedAt: i, note: filler })),
            note: 'a'.repeat(10000),
        };
        const slimmed = slimStatePayload(state);
        expect(slimmed.readingSessions).toHaveLength(100);
        expect(slimmed.pomodoroHistory).toHaveLength(100);
        expect(slimmed.readingSessions[0].timestamp).toBe(1900);
        expect(slimmed.pomodoroHistory[99].completedAt).toBe(1999);
        expect(slimmed.note).toBe('a'.repeat(10000));
    });

    it('throws when the payload is still too large after trimming', () => {
        const filler = 'x'.repeat(600);
        const state = {
            readingSessions: Array.from({ length: 2000 }, (_, i) => ({ timestamp: i, note: filler })),
            pomodoroHistory: Array.from({ length: 2000 }, (_, i) => ({ completedAt: i, note: filler })),
            hugeNote: 'y'.repeat(960000),
        };
        expect(() => slimStatePayload(state)).toThrow('sync payload too large');
    });
});
