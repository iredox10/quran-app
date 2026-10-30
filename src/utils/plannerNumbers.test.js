import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildReadingPlanner, rebalancePlanner, getPlannerOverview, getCurrentAssignment, getPlanEndDate, getMinimumDurationDays, getAssignmentProgress, addDays, formatPlannerDate } from './planner';

const today = () => formatPlannerDate(new Date());
const plan = (pages, days = 7) => buildReadingPlanner({ unitType: 'page', durationDays: days, startDate: addDays(today(), -20), startUnit: 1, endUnit: pages, chapters: [] });
const pages = plan => plan.assignments.flatMap(a => a.items.flatMap(it => Array.from({ length: it.pageEnd - it.pageStart + 1 }, (_, i) => it.pageStart + i)));
afterEach(() => vi.useRealTimers());

describe('rebalance displayed numbers', () => {
    it.each([[604, 30], [23, 15], [196, 30]])('distributes %i pages into exactly %i reading days', (total, days) => {
        const adjusted = rebalancePlanner(plan(total), 'custom_pace', days);
        expect(adjusted.durationDays).toBe(days);
        expect(adjusted.assignments).toHaveLength(days);
        expect(pages(adjusted)).toEqual(Array.from({ length: total }, (_, i) => i + 1));
        const sizes = adjusted.assignments.map(a => a.items.length);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect(getPlannerOverview(adjusted).currentDayNumber).toBe(1);
        expect(getPlannerOverview(adjusted).isFinishedWindow).toBe(false);
        expect(getPlanEndDate(adjusted)).toBe(addDays(today(), days - 1));
    });

    it('keeps partial reading percentage and selects the new unread assignment today', () => {
        const original = plan(23, 1);
        original.assignments[0].date = today();
        original.assignmentReadPages = { 1: [1, 2, 3] };
        expect(getMinimumDurationDays(original)).toBe(2);
        const adjusted = rebalancePlanner(original, 'custom_pace', 15);
        expect(adjusted.durationDays).toBe(15);
        expect(adjusted.completedDays).toEqual([1]);
        expect(getPlannerOverview(adjusted).completionRatio).toBeCloseTo(3 / 23);
        const current = getCurrentAssignment(adjusted);
        expect(current.dayNumber).toBe(2);
        expect(getAssignmentProgress(adjusted, current).totalPagesCount).toBe(2);
        expect(getAssignmentProgress(adjusted, current).readPagesCount).toBe(0);
        for (const strategy of ['extend', 'spread', 'custom_pace']) {
            const next = rebalancePlanner(adjusted, strategy, 8);
            expect(pages(next)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
            expect(getPlannerOverview(next).completionRatio).toBeCloseTo(3 / 23);
        }
    });

    it('spreads through the original finish date instead of shortening the window with rounding', () => {
        const original = plan(23, 1);
        original.assignments[0].date = addDays(today(), 14);
        const adjusted = rebalancePlanner(original, 'spread');
        expect(adjusted.durationDays).toBe(15);
        expect(getPlanEndDate(adjusted)).toBe(addDays(today(), 14));
    });

    it('caps the duration at one unread page per day', () => {
        const adjusted = rebalancePlanner(plan(3, 1), 'custom_pace', 100);
        expect(adjusted.durationDays).toBe(3);
        expect(adjusted.assignments.every(a => a.items.length === 1)).toBe(true);
    });
    it('ignores stale read pages that no longer belong to a revised day', () => {
        const p = plan(2, 1);
        p.assignmentReadPages = { 1: [1, 2, 300] };
        expect(getAssignmentProgress(p, p.assignments[0]).readPagesCount).toBe(2);
        expect(getPlannerOverview(p).completionRatio).toBe(1);
    });

});
