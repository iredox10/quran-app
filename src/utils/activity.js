/**
 * activity.js — pure date-range + session aggregation helpers shared by the
 * Progress dashboard (Activity Flow, Activity Mix, Achievements, Recent
 * Activity) and the Activity History page.
 *
 * Conventions:
 * - A "date key" is the UTC `YYYY-MM-DD` string that the store writes into
 *   `session.date` (see `logReadingSession` in useAppStore). Everything that
 *   matches sessions MUST use these UTC keys.
 * - Hour buckets use the browser's local timezone (a session recorded at
 *   21:30 local shows in the 21:00 slot even if the UTC date rolled over).
 * - Every helper is pure: no Date.now() unless `now` defaults are used, so
 *   tests can inject a fixed reference date.
 */

const DAY_MS = 86400000;

/** UTC date key matching how the store stamps sessions. */
export function dateKey(date = new Date()) {
    return date instanceof Date ? date.toISOString().split('T')[0] : String(date);
}

/** Parse a `YYYY-MM-DD` key as UTC midnight. */
export function keyToDate(key) {
    return new Date(`${key}T00:00:00.000Z`);
}

/** Shift a date key by n days (can be negative). */
export function addDays(key, n) {
    const d = keyToDate(key);
    d.setUTCDate(d.getUTCDate() + n);
    return dateKey(d);
}

/** Last n date keys ending at (and including) `endKey`. Oldest first. */
export function lastNDayKeys(n, endKey = dateKey()) {
    const keys = [];
    for (let i = n - 1; i >= 0; i--) keys.push(addDays(endKey, -i));
    return keys;
}

/** Day of week for a key, 0 = Sunday (UTC calendar day). */
export function weekdayIndex(key) {
    return keyToDate(key).getUTCDay();
}

/** Keys of the calendar week containing `now`, starting `weekStart` (0=Sun). Oldest first. */
export function weekKeys(now = new Date(), weekStart = 0) {
    const today = dateKey(now);
    const diff = (weekdayIndex(today) - weekStart + 7) % 7;
    const start = addDays(today, -diff);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Keys of the calendar month containing `now`. Oldest first. */
export function monthKeys(now = new Date()) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return Array.from({ length: days }, (_, i) => dateKey(new Date(Date.UTC(year, month, i + 1))));
}

/** How many calendar days a range spans (for "vs previous period" math). */
export function rangeSpanDays(range, now = new Date()) {
    const keys = rangeKeys(range, now);
    if (!keys) return 0;
    return keys.length;
}

export const RANGE_TABS = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
];

export const HISTORY_TABS = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
];

/**
 * Resolve a range id to an array of date keys, or `null` for "all time".
 * Supported: today | yesterday | week | month | last7 | last30 | all
 */
export function rangeKeys(range, now = new Date()) {
    const today = dateKey(now);
    switch (range) {
        case 'today': return [today];
        case 'yesterday': return [addDays(today, -1)];
        case 'week': return weekKeys(now);
        case 'month': return monthKeys(now);
        case 'last7': return lastNDayKeys(7, today);
        case 'last30': return lastNDayKeys(30, today);
        case 'all': return null;
        default: return null;
    }
}

/** The window immediately before `range`, same length — for delta comparisons. */
export function previousRangeKeys(range, now = new Date()) {
    const keys = rangeKeys(range, now);
    if (!keys || keys.length === 0) return null;
    const first = keys[0];
    const span = keys.length;
    return Array.from({ length: span }, (_, i) => addDays(first, -span + i));
}

/** Filter sessions to a range. `range === 'all'` returns the input unchanged. */
export function filterByRange(sessions = [], range = 'all', now = new Date()) {
    const keys = rangeKeys(range, now);
    if (!keys) return sessions;
    const set = new Set(keys);
    return sessions.filter((s) => set.has(s.date));
}

export function sessionsForDay(sessions = [], key) {
    return sessions.filter((s) => s.date === key);
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One point per date key: `{ key, label, date, seconds, minutes, count }`. Oldest first. */
export function bucketByDay(sessions = [], keys = []) {
    const byKey = new Map(keys.map((k) => [k, []]));
    sessions.forEach((s) => {
        if (byKey.has(s.date)) byKey.get(s.date).push(s);
    });
    return keys.map((key) => {
        const list = byKey.get(key) || [];
        const seconds = list.reduce((sum, s) => sum + (s.duration || 0), 0);
        return {
            key,
            date: key,
            name: DAY_LABELS[weekdayIndex(key)],
            label: DAY_LABELS[weekdayIndex(key)],
            seconds,
            minutes: Math.round(seconds / 60),
            count: list.length,
        };
    });
}

/** 24 hourly buckets for one day. `dayKey` filters by session.date; hours are local. */
export function bucketByHour(sessions = [], dayKey = dateKey()) {
    const day = sessionsForDay(sessions, dayKey);
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        name: hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`,
        seconds: 0,
        minutes: 0,
        count: 0,
    }));
    day.forEach((s) => {
        const ts = s.timestamp || keyToDate(s.date).getTime();
        const hour = new Date(ts).getHours();
        const b = buckets[hour];
        b.seconds += s.duration || 0;
        b.count += 1;
    });
    buckets.forEach((b) => { b.minutes = Math.round(b.seconds / 60); });
    return buckets;
}

/** ISO-ish week buckets (Sun start) covering `keys`; oldest first. */
export function bucketByWeek(sessions = [], keys = []) {
    if (keys.length === 0) return [];
    const weeks = new Map();
    const first = keys[0];
    const start = addDays(first, -weekdayIndex(first));
    const last = keys[keys.length - 1];
    const end = addDays(last, 6 - weekdayIndex(last));
    for (let k = start; k <= end; k = addDays(k, 7)) {
        weeks.set(k, { key: k, label: `Week of ${k.slice(5)}`, seconds: 0, minutes: 0, count: 0 });
    }
    const keySet = new Set(keys);
    sessions.forEach((s) => {
        if (!keySet.has(s.date)) return;
        const weekStart = addDays(s.date, -weekdayIndex(s.date));
        const w = weeks.get(weekStart);
        if (!w) return;
        w.seconds += s.duration || 0;
        w.count += 1;
    });
    const out = [...weeks.values()];
    out.forEach((w) => { w.minutes = Math.round(w.seconds / 60); });
    return out;
}

export const ACTIVITY_TYPES = ['reading', 'memorizing', 'listening', 'pomodoro'];

export const TYPE_META = {
    reading: { label: 'Reading', color: '#10b981' },
    memorizing: { label: 'Memorizing', color: '#3b82f6' },
    listening: { label: 'Listening', color: '#f59e0b' },
    pomodoro: { label: 'Focus', color: '#8b5cf6' },
};

/** Aggregate totals for a session list. */
export function summarize(sessions = []) {
    const byType = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t, 0]));
    let seconds = 0;
    const activeDaySet = new Set();
    sessions.forEach((s) => {
        const d = s.duration || 0;
        seconds += d;
        if (byType[s.type] !== undefined) byType[s.type] += d;
        if (d > 0) activeDaySet.add(s.date);
    });
    const activeDays = activeDaySet.size;
    return {
        seconds,
        minutes: Math.round(seconds / 60),
        count: sessions.length,
        activeDays,
        avgPerActiveDay: activeDays ? Math.round(seconds / activeDays / 60) : 0,
        byType,
    };
}

/** Percentage change of current vs previous period, rounded. Null when previous is 0. */
export function deltaPercent(currentSeconds, previousSeconds) {
    if (!previousSeconds) return currentSeconds > 0 ? null : 0;
    return Math.round(((currentSeconds - previousSeconds) / previousSeconds) * 100);
}

/** `1h 05m` / `42m` style label for a seconds value. */
export function formatDuration(seconds = 0) {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

/** Human range title, e.g. "Oct 3" / "Oct 1 – Oct 7" / "October 2026". */
export function rangeTitle(range, now = new Date()) {
    const keys = rangeKeys(range, now);
    if (!keys) return 'All time';
    const fmt = (key) => keyToDate(key).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    if (keys.length === 1) return fmt(keys[0]);
    const first = keyToDate(keys[0]);
    const last = keyToDate(keys[keys.length - 1]);
    if (first.getUTCMonth() === last.getUTCMonth() && first.getUTCFullYear() === last.getUTCFullYear()) {
        return `${first.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${last.getUTCDate()}`;
    }
    return `${fmt(keys[0])} – ${fmt(keys[keys.length - 1])}`;
}
