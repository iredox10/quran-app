import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './useAppStore';
import { buildReadingPlanner, getAssignmentProgress } from '../utils/planner';

beforeEach(() => useAppStore.setState(useAppStore.getInitialState()));
describe('planner reading lifecycle', () => {
    it('only completes the final page when it is explicitly read', () => {
        const plan = buildReadingPlanner({ unitType: 'page', durationDays: 1, startDate: '2026-11-05', startUnit: 1, endUnit: 3, chapters: [] });
        useAppStore.getState().setPlanner(plan);
        useAppStore.getState().markPlannerPageRead(1, 1);
        useAppStore.getState().markPlannerPageRead(1, 2);
        let state = useAppStore.getState();
        expect(getAssignmentProgress(state.planner, state.planner.assignments[0]).isComplete).toBe(false);
        state.markPlannerPageRead(1, 3);
        state = useAppStore.getState();
        expect(getAssignmentProgress(state.planner, state.planner.assignments[0]).isComplete).toBe(true);
    });
    it('archives the original with its timer and restarts with fresh progress', () => {
        const plan = buildReadingPlanner({ unitType: 'page', durationDays: 1, startDate: '2026-11-05', startUnit: 1, endUnit: 1, chapters: [] });
        useAppStore.getState().setPlanner(plan);
        useAppStore.getState().markPlannerPageRead(1, 1);
        useAppStore.setState({ plannerSessionTimers: { [plan.id]: { 1: { totalSeconds: 120 } } } });
        useAppStore.getState().restartPlanner();
        const state = useAppStore.getState();
        expect(state.planner.id).not.toBe(plan.id);
        expect(state.archivedPlanners.find(p => p.id === plan.id).assignmentReadPages[1]).toEqual([1]);
        expect(state.plannerSessionTimers[plan.id][1].totalSeconds).toBe(120);
        expect(state.planner.assignmentReadPages).toEqual({});
    });
    it('records planner context and clears it when a regular reader is used', () => {
        const store = useAppStore.getState();
        store.addRecentlyRead(1, 'Al-Fatihah', null, { plannerId: 'p', plannerDay: 2, pageNumber: 1 });
        expect(useAppStore.getState().recentlyRead[0].plannerId).toBe('p');
        store.addRecentlyRead(1, 'Al-Fatihah', '1:2');
        expect(useAppStore.getState().recentlyRead[0].plannerId).toBeUndefined();
    });
});
