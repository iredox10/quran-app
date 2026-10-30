import { getAssignmentProgress } from './planner';

const seconds = value => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
export const isPlannerComplete = plan => !!plan?.assignments?.length && plan.assignments.every(a => getAssignmentProgress(plan, a).isComplete);
const completedOn = plan => isPlannerComplete(plan) ? Object.values(plan.assignmentCompletedAt || {}).filter(Boolean).sort().at(-1) || null : null;
export function plannerHistoryPlans(live = [], archived = []) {
    return [...new Map([...live.filter(isPlannerComplete), ...archived].map(p => [p.id, p])).values()]
        .sort((a, b) => String(completedOn(b) || b.archivedAt || b.createdAt || '').localeCompare(String(completedOn(a) || a.archivedAt || a.createdAt || '')) || String(a.id).localeCompare(String(b.id)));
}
export function summarizePlannerHistory(plan, timers = {}) {
    const progress = plan.assignments.map(a => getAssignmentProgress(plan, a));
    const dated = {}, legacy = [];
    Object.entries(timers).sort(([a], [b]) => Number(a) - Number(b)).forEach(([day, timer]) => {
        const daily = Object.entries(timer?.secondsByDate || {}).filter(([date, time]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && seconds(time) > 0);
        daily.forEach(([date, time]) => { dated[date] = (dated[date] || 0) + seconds(time); });
        const undated = Math.max(0, seconds(timer?.totalSeconds ?? timer) - daily.reduce((sum, [, time]) => sum + seconds(time), 0));
        if (undated) legacy.push({ date: null, dayNumber: Number(day), seconds: undated });
    });
    let cumulative = 0;
    const readingDays = [...legacy, ...Object.entries(dated).sort(([a], [b]) => a.localeCompare(b)).map(([date, seconds]) => ({ date, seconds }))]
        .map(day => ({ ...day, cumulativeSeconds: cumulative += day.seconds }));
    return {
        completed: isPlannerComplete(plan), completedDays: progress.filter(p => p.isComplete).length,
        totalDays: plan.assignments.length, pagesRead: progress.reduce((sum, p) => sum + p.readPagesCount, 0),
        totalPages: progress.reduce((sum, p) => sum + p.totalPagesCount, 0), totalSeconds: cumulative,
        timedDays: Object.keys(dated).length,
        averageSeconds: Object.keys(dated).length ? Math.floor(Object.values(dated).reduce((a, b) => a + b, 0) / Object.keys(dated).length) : 0,
        completedOn: completedOn(plan), readingDays,
    };
}
export function addPlannerReadingTime(timer = {}, additionalSeconds, endedAt = Date.now()) {
    const delta = seconds(additionalSeconds);
    const secondsByDate = { ...timer.secondsByDate };
    let cursor = endedAt - delta * 1000;
    let allocated = 0;
    while (cursor < endedAt) {
        const midnight = new Date(cursor);
        midnight.setHours(24, 0, 0, 0);
        const end = Math.min(midnight.getTime(), endedAt);
        const part = Math.floor((end - cursor) / 1000);
        const date = dateKey(cursor);
        secondsByDate[date] = (secondsByDate[date] || 0) + part;
        allocated += part;
        cursor = end;
    }
    if (allocated < delta) {
        const date = dateKey(endedAt - 1);
        secondsByDate[date] = (secondsByDate[date] || 0) + delta - allocated;
    }
    return { ...timer, totalSeconds: seconds(timer.totalSeconds) + delta, startedAt: null, secondsByDate };
}
function dateKey(time) {
    const d = new Date(time);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function historyDuration(value) {
    const s = seconds(value);
    if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m`;
    if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${s}s`;
}
