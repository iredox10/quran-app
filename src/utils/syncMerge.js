import { normalizeSyncLibrary } from './syncLibrary';
// Bidirectional merge semantics for cloud sync.
// The cloud document is treated as a superset snapshot: pushes merge local
// into the existing remote doc, pulls merge remote into local. This keeps
// bookmarks / history / recently read from both devices instead of
// last-writer-wins clobbering. Trade-off: deletions don't propagate.

function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
}

const ARRAY_KEY = {
    bookmarks: 'verseKey',
    memorizedAyahs: null,
    memorizedSurahs: null,
    downloadedSurahs: null,
    completedTours: null,
    dismissedCoachmarks: null,
    dismissedGestureTips: null,
    hifdhGoals: 'id',
    archivedPlanners: 'id',
    pomodoroHistory: 'completedAt',
    readingSessions: 'timestamp',
    recentlyRead: 'chapterId',
};

function identityOf(item, key) {
    return key === null ? item : item?.[key];
}

function mergeItem(baseItem, incomingItem, field) {
    if (baseItem === undefined) return incomingItem;
    if (field === 'recentlyRead') {
        const a = baseItem.timestamp || 0;
        const b = incomingItem.timestamp || 0;
        return b >= a ? incomingItem : baseItem;
    }
    return incomingItem;
}

function mergeArray(base, incoming, field) {
    const key = ARRAY_KEY[field];
    const map = new Map();
    (base || []).forEach(item => map.set(identityOf(item, key), item));
    (incoming || []).forEach(item => {
        const id = identityOf(item, key);
        map.set(id, mergeItem(map.get(id), item, field));
    });
    let merged = Array.from(map.values());
    if (field === 'recentlyRead') {
        merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        merged = merged.slice(0, 20);
    }
    if (field === 'readingSessions') merged = merged.slice(-500);
    if (field === 'pomodoroHistory') merged = merged.slice(-500);
    return merged;
}

// Collection items are keyed by (collection id, verse key) so the same verse
// can live in several collections at once. This is the canonical key on both
// clients: the Android engine keys `"${collectionId}|${verseKey}"`.
function collectionItemKey(collectionId, item) {
    return `${collectionId}|${item?.verseKey}`;
}

function mergeCollections(base, incoming) {
    const map = new Map((base || []).map(c => [c.id, { ...c }]));
    (incoming || []).forEach(inc => {
        const existing = map.get(inc.id);
        if (!existing) {
            map.set(inc.id, { ...inc });
            return;
        }
        const itemsMap = new Map((existing.items || []).map(i => [collectionItemKey(inc.id, i), i]));
        (inc.items || []).forEach(i => itemsMap.set(collectionItemKey(inc.id, i), i));
        map.set(inc.id, { ...existing, ...inc, items: Array.from(itemsMap.values()) });
    });
    return Array.from(map.values());
}

const PLANNER_DAY_PROGRESS_FIELDS = ['assignmentProgress','assignmentReadPages','assignmentCompletedItems','assignmentCompletedAt','completedDays'];
const PLANNER_SCHEDULE_FIELDS = ['assignments','durationDays','startDate','startUnit','endUnit','unitType','isCustomRange','excludeDays'];
const completeScheduleShape = plan => Array.isArray(plan.assignments) && plan.assignments.some(day =>
    isPlainObject(day) && ('items' in day));
const usableSchedule = (plan, requireCompleteRows = false) => {
    const number = (row,key,min=0) => typeof row[key] === 'number' && Number.isFinite(row[key]) && row[key]>=min;
    return Array.isArray(plan.assignments) && plan.assignments.length > 0 && plan.assignments.every(day => {
        if(!isPlainObject(day) || !number(day,'dayNumber',1)) return false;
        if(!requireCompleteRows) return true;
        return Array.isArray(day.items) && typeof day.date==='string' && day.date.trim().length>0 &&
            ['unitType','title','subtitle','primaryRoute'].every(key=>typeof day[key]==='string') &&
            ['startUnit','endUnit','pageStart','pageEnd'].every(key=>number(day,key)) &&
            day.items.every(item=>isPlainObject(item) && ['title','subtitle','route'].every(key=>typeof item[key]==='string') &&
                (typeof item.rangeValue==='string' || (typeof item.rangeValue==='number' && Number.isFinite(item.rangeValue))) &&
                ['pageStart','pageEnd'].every(key=>number(item,key)));
    }) && (!requireCompleteRows || plan.assignments.some(day=>day.items.length>0));
};
const scheduleRevision = plan => Number.isFinite(Number(plan.assignmentsUpdatedAt)) ? Math.max(0,Number(plan.assignmentsUpdatedAt)) : 0;

function mergePlanners(base, incoming) {
    const map = new Map((base || []).map(p => [p.id, p]));
    (incoming || []).forEach(inc => {
        const existing = map.get(inc.id);
        if (!existing) {
            map.set(inc.id, inc);
            return;
        }
        const merged = mergeValue(existing, inc);
        const previousRevision = scheduleRevision(existing);
        const incomingRevision = scheduleRevision(inc);
        const previousSchedule = usableSchedule(existing,completeScheduleShape(existing) || completeScheduleShape(inc)), nextSchedule = usableSchedule(inc,completeScheduleShape(existing) || completeScheduleShape(inc));
        const invalidReplacement = previousSchedule && 'assignments' in inc && !nextSchedule;
        if (previousRevision || incomingRevision || invalidReplacement) {
            if (nextSchedule && (!previousSchedule || incomingRevision > previousRevision)) {
                merged.assignments = inc.assignments;
                merged.assignmentsUpdatedAt = Math.max(previousRevision,incomingRevision);
                for(const field of PLANNER_DAY_PROGRESS_FIELDS) {
                    if(isPlainObject(inc[field]) || Array.isArray(inc[field])) merged[field]=inc[field];
                }
            } else {
                // A delayed progress packet cannot change a newer schedule's duration or range.
                for (const field of PLANNER_SCHEDULE_FIELDS) {
                    if (field in existing) merged[field] = existing[field]; else delete merged[field];
                }
                if(incomingRevision!==previousRevision) for(const field of PLANNER_DAY_PROGRESS_FIELDS) {
                    if(field in existing) merged[field]=existing[field]; else delete merged[field];
                }
                if ('assignmentsUpdatedAt' in existing) merged.assignmentsUpdatedAt = previousRevision;
                else delete merged.assignmentsUpdatedAt;
            }
        }
        map.set(inc.id, merged);
    });
    return Array.from(map.values());
}

function mergeValue(base, incoming) {
    if (incoming === undefined) return base;
    if (base === undefined) return incoming;
    // Nulls never replace a unioned array/map child (see mergeStateInto).
    if (incoming === null && (Array.isArray(base) || isPlainObject(base))) return base;
    if (base === null || incoming === null) return incoming ?? base;
    if (Array.isArray(base) && Array.isArray(incoming)) {
        return mergeValueArrays(base, incoming);
    }
    if (isPlainObject(base) && isPlainObject(incoming)) {
        const out = { ...base };
        for (const key of Object.keys(incoming)) {
            out[key] = mergeValue(base[key], incoming[key]);
        }
        return out;
    }
    return incoming;
}

function hasDayNumber(item) {
    return isPlainObject(item) && item.dayNumber !== undefined;
}

function isDayNumberArray(v) {
    return Array.isArray(v) && v.length > 0 && v.every(hasDayNumber);
}

function updatedAtOf(item) {
    const t = Number(item?.updatedAt);
    return Number.isFinite(t) ? t : 0;
}

function mergeValueArrays(base, incoming) {
    if (isDayNumberArray(base) && isDayNumberArray(incoming)) {
        const map = new Map();
        [...base, ...incoming].forEach(item => {
            const existing = map.get(item.dayNumber);
            if (!existing || updatedAtOf(item) >= updatedAtOf(existing)) {
                map.set(item.dayNumber, item);
            }
        });
        return Array.from(map.values());
    }
    const map = new Map();
    base.forEach(item => map.set(JSON.stringify(item), item));
    incoming.forEach(item => map.set(JSON.stringify(item), item));
    return Array.from(map.values());
}

function visitCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return n > 0 ? n : 0;
}

/**
 * Merge `incoming` state into `base` state.
 * - Lists with identity keys: union (dedupe, latest wins per key)
 * - Keyed maps: recursive deep merge
 * - pageVisitCounts: per-key max
 * - Scalars / settings / positions: incoming wins
 */
export function mergeStateInto(base, incoming) {
    if (!isPlainObject(base) || !isPlainObject(incoming)) return incoming || base;
    const out = { ...base };

    for (const field of Object.keys(incoming)) {
        const inc = incoming[field];
        if (inc === undefined) continue;
        // A section the other device never wrote can arrive as null. For array /
        // map fields that null must not replace the base value, otherwise one
        // device's empty section silently wipes the other's data — the Android
        // engine drops null entries before merging, so this keeps both sides
        // aligned. Scalars keep incoming-wins semantics.
        if (inc === null && (Array.isArray(out[field]) || isPlainObject(out[field]))) continue;

        if (field === 'recentlyRead') {
            out[field] = mergeArray(out[field], inc, 'recentlyRead');
        } else if (field === 'collections') {
            out[field] = mergeCollections(out[field], inc);
        } else if (field === 'planners') {
            out[field] = mergePlanners(out[field], inc);
        } else if ((field === 'pageVisitCounts' || field === 'bookmarkRemovals')) {
            const counts = { ...(out[field] || {}) };
            const keys = new Set([...Object.keys(counts), ...Object.keys(inc || {})]);
            keys.forEach(k => {
                counts[k] = Math.max(visitCount(counts[k]), visitCount(inc[k]));
            });
            out[field] = counts;
        } else if (Object.prototype.hasOwnProperty.call(ARRAY_KEY, field)) {
            out[field] = mergeArray(out[field], inc, field);
        } else if (field === 'plannerBookmarks') {
            out[field] = mergeValue(out[field] || {}, inc);
        } else if (field === 'plannerReflections' || field === 'plannerSessionTimers'
            || field === 'saukaProgress' || field === 'hifdhHistory' || field === 'offlinePackStatus') {
            out[field] = mergeValue(out[field] || {}, inc);
        } else if (Array.isArray(inc) && Array.isArray(out[field])) {
            out[field] = mergeValueArrays(out[field], inc);
        } else if (isPlainObject(inc) && isPlainObject(out[field])) {
            out[field] = mergeValue(out[field], inc);
        } else {
            out[field] = inc; // scalar / position: incoming wins
        }
    }
    if (Array.isArray(out.planners)) {
        out.planner = out.planners.find(p => p?.id === out.activePlannerId)
            || out.planners.find(p => out.planner && p?.id === out.planner.id)
            || (out.planner ?? null);
    }
    return normalizeSyncLibrary(out);
}

function dedupeAssignments(items) {
    const map = new Map();
    items.forEach(item => {
        const existing = map.get(item.dayNumber);
        if (!existing || updatedAtOf(item) > updatedAtOf(existing)) {
            map.set(item.dayNumber, item);
        }
    });
    return Array.from(map.values());
}

function slimDeep(value) {
    if (Array.isArray(value)) {
        let changed = false;
        const out = value.map(item => {
            const next = slimDeep(item);
            if (next !== item) changed = true;
            return next;
        });
        return changed ? out : value;
    }
    if (!isPlainObject(value)) return value;
    let out = value;
    for (const key of Object.keys(value)) {
        const current = value[key];
        const next = (key === 'assignments' && isDayNumberArray(current))
            ? dedupeAssignments(current)
            : slimDeep(current);
        if (next !== current) {
            if (out === value) out = { ...value };
            out[key] = next;
        }
    }
    return out;
}

function clampCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.min(10000, Math.max(0, Math.trunc(n)));
}

export function slimStatePayload(state, { validate = true } = {}) {
    const result = { ...state };
    delete result.planner;

    if (isPlainObject(result.pageVisitCounts)) {
        const counts = {};
        Object.keys(result.pageVisitCounts).forEach(k => {
            const n = clampCount(result.pageVisitCounts[k]);
            if (n !== null) counts[k] = n;
        });
        result.pageVisitCounts = counts;
    }

    const slimmed = slimDeep(result);

    // Planner schedules can legitimately exceed the old Appwrite-sized document cap.
    // Never discard reading history just to fit a backup; the backend shares this bound.
    const size = JSON.stringify(slimmed).length;
    if (validate && size > 8_000_000) {
        const error = new Error('sync payload too large: ' + size + ' chars');
        error.retryable = false;
        throw error;
    }
    return slimmed;
}
