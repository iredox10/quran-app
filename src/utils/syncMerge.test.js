import { describe, it, expect } from 'vitest';
import { mergeStateInto } from './syncMerge';

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

    it('sums pageVisitCounts from both devices', () => {
        const merged = mergeStateInto(
            { pageVisitCounts: { home: 5, library: 2 } },
            { pageVisitCounts: { home: 3, planner: 1 } }
        );
        expect(merged.pageVisitCounts).toEqual({ home: 8, library: 2, planner: 1 });
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
});
