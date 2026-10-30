import { describe, it, expect } from 'vitest';
import { buildReadingPlanner, rebalancePlanner } from './planner';
import { addPlannerReadingTime, plannerHistoryPlans, summarizePlannerHistory, isPlannerComplete } from './plannerHistory';
import { mergeStateInto } from './syncMerge';
const plan = () => buildReadingPlanner({ unitType: 'page', durationDays: 2, startDate: '2026-10-01', startUnit: 1, endUnit: 4, chapters: [] });
const completed = () => ({ ...plan(), assignmentProgress: { 1: 2, 2: 2 }, assignmentCompletedAt: { 1: '2026-10-01', 2: '2026-10-03' } });
describe('planner history', () => {
    it('includes completed live and archived ended plans and deduplicates by id', () => {
        const done = completed(), archived = { ...done, archivedAt: '2026-10-04T00:00:00Z' };
        const ended = { ...plan(), id: 'ended', archivedAt: '2026-10-02T00:00:00Z' };
        const entries = plannerHistoryPlans([done, ended], [archived, ended]);
        expect(entries).toHaveLength(2);
        expect(entries.find(p => p.id === done.id)).toEqual(archived);
        expect(isPlannerComplete(ended)).toBe(false);
    });
    it('includes old and orphan timer rows without inventing dates or losing cumulative time', () => {
        const result = summarizePlannerHistory(completed(), {
            1: { totalSeconds: 150, secondsByDate: { '2026-10-01': 90 } },
            2: { totalSeconds: 60, secondsByDate: { '2026-10-01': 30, '2026-10-03': 30 } },
            9: { totalSeconds: 20 },
        });
        expect(result.totalSeconds).toBe(230);
        expect(result.readingDays.at(-1).cumulativeSeconds).toBe(230);
        expect(result.timedDays).toBe(2);
        expect(result.averageSeconds).toBe(75);
        expect(result.readingDays.filter(d => !d.date)).toHaveLength(2);
        expect(result.pagesRead).toBe(4);
        expect(result.completedOn).toBe('2026-10-03');
    });
    it('keeps calendar reading time after schedule rebalancing', () => {
        const before = { ...plan(), assignmentReadPages: { 1: [1] } };
        const timers = { 1: { totalSeconds: 120, secondsByDate: { '2026-10-01': 120 } } };
        const after = rebalancePlanner(before, 'custom_pace', 3, '2026-10-05');
        expect(summarizePlannerHistory(after, timers).readingDays).toEqual(summarizePlannerHistory(before, timers).readingDays);
    });
    it('splits new reading time across local midnight exactly', () => {
        const end = new Date(2026, 9, 31, 0, 0, 30).getTime();
        const timer = addPlannerReadingTime({ totalSeconds: 10 }, 60, end);
        expect(timer.totalSeconds).toBe(70);
        expect(timer.secondsByDate).toEqual({ '2026-10-30': 30, '2026-10-31': 30 });
        expect(summarizePlannerHistory(plan(), { 1: timer }).totalSeconds).toBe(70);
    });
    it('preserves calendar dates when old and new clients sync timer records', () => {
        const initial = { plannerSessionTimers: { p: { 1: { totalSeconds: 60, secondsByDate: { '2026-10-01': 60 } } } } };
        const merged = mergeStateInto(initial, { plannerSessionTimers: { p: { 1: { totalSeconds: 90, secondsByDate: { '2026-10-02': 30 } } } } });
        expect(merged.plannerSessionTimers.p[1].secondsByDate).toEqual({ '2026-10-01': 60, '2026-10-02': 30 });
        expect(summarizePlannerHistory(plan(), merged.plannerSessionTimers.p).totalSeconds).toBe(90);
    });
    it('does not manufacture reading time or trust stale completed-day flags', () => {
        expect(summarizePlannerHistory(completed()).totalSeconds).toBe(0);
        expect(isPlannerComplete({ ...plan(), completedDays: [1, 2] })).toBe(false);
    });
});
