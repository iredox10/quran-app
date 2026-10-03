/**
 * library.js — pure helpers for the Bookmarks, Collections, and Recent
 * Surahs pages. No React, no store access: everything takes plain data so it
 * is trivially testable (see library.test.js).
 *
 * Data shapes (from useAppStore):
 *   bookmark   = { verseKey: '2:255', surahName, chapterId, createdAt? }
 *   collection = { id, name, items: [{ verseKey, surahName, chapterId }] }
 *   recentItem = { chapterId, chapterName, verseKey|null, timestamp }
 */

/** Trimmed, lowercased query — the canonical form used by every matcher. */
export function normalizeQuery(query = '') {
    return String(query).trim().toLowerCase();
}

/** `'just now' | '5m ago' | '3h ago' | 'yesterday' | 'Oct 3' | 'Oct 3, 2025'` */
export function timeAgo(timestamp, now = Date.now()) {
    if (!timestamp) return '';
    const diff = Math.max(0, now - timestamp);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    const d = new Date(timestamp);
    const sameYear = d.getFullYear() === new Date(now).getFullYear();
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

/** `'2:255' -> { chapterId: 2, ayahNumber: 255 }`; invalid keys give nulls. */
export function parseVerseKey(verseKey = '') {
    const [chapter, ayah] = String(verseKey).split(':');
    const chapterId = Number.parseInt(chapter, 10);
    const ayahNumber = Number.parseInt(ayah, 10);
    return {
        chapterId: Number.isFinite(chapterId) ? chapterId : null,
        ayahNumber: Number.isFinite(ayahNumber) ? ayahNumber : null,
    };
}

/** Quran.com API pagination page (1-based) that contains `ayahNumber`. */
export function pageForAyah(ayahNumber, perPage = 50) {
    const n = Number(ayahNumber);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.ceil(n / perPage);
}

/**
 * Does one bookmark match a free-text query?
 * Matches surah name, full verse key ("2:255"), ayah number ("255"),
 * and "surah 2" / "ayah 255" style phrases.
 * `chapterNameResolver(chapterId)` is optional and lets callers supply the
 * canonical chapter name (from the chapters query) for name matching.
 */
export function matchesBookmark(bookmark, query, chapterNameResolver) {
    const q = normalizeQuery(query);
    if (!q) return true;
    const { chapterId, ayahNumber } = parseVerseKey(bookmark?.verseKey);
    const names = [bookmark?.surahName, chapterNameResolver?.(chapterId)].filter(Boolean).map((n) => String(n).toLowerCase());
    if (names.some((n) => n.includes(q))) return true;
    if (String(bookmark?.verseKey || '').toLowerCase().includes(q)) return true;
    if (chapterId !== null && (q === `surah ${chapterId}` || q === `surah${chapterId}`)) return true;
    if (ayahNumber !== null && (q === String(ayahNumber) || q === `ayah ${ayahNumber}`)) return true;
    return false;
}

export function searchBookmarks(bookmarks = [], query = '', chapterNameResolver) {
    if (!normalizeQuery(query)) return bookmarks;
    return bookmarks.filter((b) => matchesBookmark(b, query, chapterNameResolver));
}

/**
 * Sort bookmarks. Modes:
 *   'recent'   — newest `createdAt` first; bookmarks without createdAt keep
 *                their original relative order (array order = insertion order)
 *   'surah'    — chapterId asc, then ayah asc
 *   'ayah'     — surah name alphabetically, then ayah asc
 * Returns a new array.
 */
export function sortBookmarks(bookmarks = [], mode = 'recent') {
    const list = [...bookmarks];
    if (mode === 'surah') {
        return list.sort((a, b) => {
            const ca = parseVerseKey(a.verseKey).chapterId ?? 0;
            const cb = parseVerseKey(b.verseKey).chapterId ?? 0;
            if (ca !== cb) return ca - cb;
            return (parseVerseKey(a.verseKey).ayahNumber ?? 0) - (parseVerseKey(b.verseKey).ayahNumber ?? 0);
        });
    }
    if (mode === 'ayah') {
        return list.sort((a, b) => {
            const na = String(a.surahName || '').localeCompare(String(b.surahName || ''));
            if (na !== 0) return na;
            return (parseVerseKey(a.verseKey).ayahNumber ?? 0) - (parseVerseKey(b.verseKey).ayahNumber ?? 0);
        });
    }
    // 'recent': stable — original order preserved among items lacking createdAt
    return list
        .map((b, index) => ({ b, index }))
        .sort((x, y) => {
            const ta = x.b.createdAt || 0;
            const tb = y.b.createdAt || 0;
            if (ta !== tb) return tb - ta;
            return y.index - x.index; // insertion order = newest added last
        })
        .map((x) => x.b);
}

/** Group `{ verseKey, surahName, chapterId }` items by chapter, Quran order. */
export function groupBySurah(items = []) {
    const map = new Map();
    items.forEach((item) => {
        const { chapterId } = parseVerseKey(item?.verseKey);
        const key = chapterId ?? item?.chapterId ?? 0;
        if (!map.has(key)) {
            map.set(key, { chapterId: key, surahName: item?.surahName || `Surah ${key}`, items: [] });
        }
        map.get(key).items.push(item);
    });
    return [...map.values()].sort((a, b) => a.chapterId - b.chapterId);
}

/** Match a collection by name, or by any contained verse's surah name. */
export function matchesCollection(collection, query) {
    const q = normalizeQuery(query);
    if (!q) return true;
    if (String(collection?.name || '').toLowerCase().includes(q)) return true;
    return (collection?.items || []).some((item) => String(item?.surahName || '').toLowerCase().includes(q));
}

export function searchCollections(collections = [], query = '') {
    if (!normalizeQuery(query)) return collections;
    return collections.filter((c) => matchesCollection(c, query));
}

/** `{ verseCount, surahCount }` for a collection. */
export function collectionStats(collection) {
    const items = collection?.items || [];
    const surahs = new Set();
    items.forEach((item) => {
        const { chapterId } = parseVerseKey(item?.verseKey);
        surahs.add(chapterId ?? item?.chapterId ?? 0);
    });
    return { verseCount: items.length, surahCount: surahs.size };
}

/**
 * Validate a collection name for create/rename. Returns an error string or null.
 * `ignoreName` = the collection's current name when renaming (so a collection
 * never clashes with itself).
 */
export function validateCollectionName(name, { existingNames = [], ignoreName = null } = {}) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return 'Name cannot be empty';
    if (trimmed.length > 60) return 'Name is too long (max 60 characters)';
    const clash = existingNames.some(
        (n) => String(n).toLowerCase() === trimmed.toLowerCase() && String(n) !== String(ignoreName)
    );
    if (clash) return 'A collection with that name already exists';
    return null;
}
