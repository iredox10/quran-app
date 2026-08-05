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
        merged = merged.slice(0, 5);
    }
    if (field === 'readingSessions') merged = merged.slice(-500);
    if (field === 'pomodoroHistory') merged = merged.slice(-500);
    return merged;
}

function mergeCollections(base, incoming) {
    const map = new Map((base || []).map(c => [c.id, { ...c }]));
    (incoming || []).forEach(inc => {
        const existing = map.get(inc.id);
        if (!existing) {
            map.set(inc.id, { ...inc });
            return;
        }
        const itemsMap = new Map((existing.items || []).map(i => [i.verseKey, i]));
        (inc.items || []).forEach(i => itemsMap.set(i.verseKey, i));
        map.set(inc.id, { ...existing, items: Array.from(itemsMap.values()) });
    });
    return Array.from(map.values());
}

function mergePlanners(base, incoming) {
    const map = new Map((base || []).map(p => [p.id, p]));
    (incoming || []).forEach(inc => {
        const existing = map.get(inc.id);
        if (!existing) {
            map.set(inc.id, inc);
            return;
        }
        map.set(inc.id, mergeValue(existing, inc));
    });
    return Array.from(map.values());
}

function mergeValue(base, incoming) {
    if (incoming === undefined) return base;
    if (base === undefined) return incoming;
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

function mergeValueArrays(base, incoming) {
    const map = new Map();
    base.forEach(item => map.set(JSON.stringify(item), item));
    incoming.forEach(item => map.set(JSON.stringify(item), item));
    return Array.from(map.values());
}

/**
 * Merge `incoming` state into `base` state.
 * - Lists with identity keys: union (dedupe, latest wins per key)
 * - Keyed maps: recursive deep merge
 * - pageVisitCounts: summed
 * - Scalars / settings / positions: incoming wins
 */
export function mergeStateInto(base, incoming) {
    if (!isPlainObject(base) || !isPlainObject(incoming)) return incoming || base;
    const out = { ...base };

    for (const field of Object.keys(incoming)) {
        const inc = incoming[field];
        if (inc === undefined) continue;

        if (field === 'recentlyRead') {
            out[field] = mergeArray(out[field], inc, 'recentlyRead');
        } else if (field === 'collections') {
            out[field] = mergeCollections(out[field], inc);
        } else if (field === 'planners') {
            out[field] = mergePlanners(out[field], inc);
        } else if (field === 'pageVisitCounts') {
            const counts = { ...(out[field] || {}) };
            Object.keys(inc).forEach(k => {
                counts[k] = (counts[k] || 0) + (inc[k] || 0);
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
    return out;
}
