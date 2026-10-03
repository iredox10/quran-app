/**
 * historyFilter.js — pure search + grouping helpers for the Activity History
 * page (/progress/activity). No React, no Date.now(): callers inject `now`
 * so tests can pin a reference date.
 *
 * Sessions follow the store shape: { date: 'YYYY-MM-DD', duration, type,
 * chapterId, timestamp }.
 */
import { filterByRange, dateKey, addDays, keyToDate, TYPE_META } from './activity';

/** Trim + lowercase a search query. Empty/missing queries normalize to ''. */
export function normalizeQuery(query) {
    return String(query ?? '').trim().toLowerCase();
}

/**
 * The searchable names for a resolved chapter. Accepts a chapter object
 * ({ name_simple, name_arabic }) or a plain name string.
 */
export function chapterNames(chapter) {
    if (!chapter) return [];
    if (typeof chapter === 'string') return [chapter];
    return [chapter.name_simple, chapter.name_arabic].filter(Boolean);
}

/**
 * Case-insensitive match of a session against a query.
 * Matches: activity type (raw id + TYPE_META label, e.g. "reading"/"focus"),
 * surah name (name_simple + name_arabic via the resolver) and "surah {id}".
 * An empty query always matches.
 *
 * @param {object} session
 * @param {string} query
 * @param {(chapterId: any) => object|string|null} chapterNameResolver
 */
export function matchesQuery(session, query, chapterNameResolver) {
    const q = normalizeQuery(query);
    if (!q) return true;

    const typeWords = [session?.type, TYPE_META[session?.type]?.label].filter(Boolean);
    if (typeWords.some((word) => String(word).toLowerCase().includes(q))) return true;

    const chapterId = session?.chapterId;
    if (chapterId !== undefined && chapterId !== null && chapterId !== '') {
        const chapter = chapterNameResolver ? chapterNameResolver(chapterId) : null;
        if (chapterNames(chapter).some((name) => String(name).toLowerCase().includes(q))) return true;
        if (`surah ${chapterId}`.toLowerCase().includes(q)) return true;
    }

    return false;
}

/**
 * Range + query filtering. `range` is any rangeKeys() id ('all' keeps everything).
 * Returns a new array, order untouched.
 */
export function filterSessions(sessions = [], options = {}) {
    const { range = 'all', query = '', chapterNameResolver = null, now = new Date() } = options;
    const inRange = filterByRange(sessions, range, now);
    if (!normalizeQuery(query)) return inRange;
    return inRange.filter((session) => matchesQuery(session, query, chapterNameResolver));
}

/** Sort timestamp: explicit `timestamp`, else the session's date at UTC midnight. */
export function sessionTime(session) {
    if (session?.timestamp) return session.timestamp;
    const t = keyToDate(session?.date || '').getTime();
    return Number.isNaN(t) ? 0 : t;
}

/** "Today" / "Yesterday" / "Mon, Oct 5" heading for a date key. */
export function dayLabel(key, now = new Date()) {
    const today = dateKey(now);
    if (key === today) return 'Today';
    if (key === addDays(today, -1)) return 'Yesterday';
    return keyToDate(key).toLocaleDateString('en', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/**
 * Group sessions by `session.date`, newest day first, sessions newest first
 * within each day. Each group: { key, label, sessions, totalSeconds }.
 */
export function groupSessionsByDay(sessions = [], now = new Date()) {
    const byDay = new Map();
    sessions.forEach((session) => {
        const key = session?.date;
        if (!key) return;
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(session);
    });

    const groups = [];
    byDay.forEach((list, key) => {
        list.sort((a, b) => sessionTime(b) - sessionTime(a));
        groups.push({
            key,
            label: dayLabel(key, now),
            sessions: list,
            totalSeconds: list.reduce((sum, s) => sum + (s.duration || 0), 0),
        });
    });
    groups.sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
    return groups;
}
