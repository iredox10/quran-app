import { describe, it, expect } from 'vitest';
import {
    normalizeQuery,
    timeAgo,
    parseVerseKey,
    pageForAyah,
    matchesBookmark,
    searchBookmarks,
    sortBookmarks,
    groupBySurah,
    searchCollections,
    collectionStats,
    validateCollectionName,
} from './library';

const bm = (verseKey, surahName, chapterId, createdAt) => ({ verseKey, surahName, chapterId, ...(createdAt ? { createdAt } : {}) });

describe('normalizeQuery', () => {
    it('trims and lowercases', () => {
        expect(normalizeQuery('  Baqara ')).toBe('baqara');
        expect(normalizeQuery(undefined)).toBe('');
    });
});

describe('timeAgo', () => {
    const now = Date.parse('2026-10-03T12:00:00Z');
    it('handles minutes, hours, days', () => {
        expect(timeAgo(now - 10_000, now)).toBe('just now');
        expect(timeAgo(now - 5 * 60_000, now)).toBe('5m ago');
        expect(timeAgo(now - 3 * 3600_000, now)).toBe('3h ago');
        expect(timeAgo(now - 26 * 3600_000, now)).toBe('yesterday');
        expect(timeAgo(now - 3 * 86400_000, now)).toBe('3d ago');
    });
    it('falls back to a date beyond a week and handles empty input', () => {
        expect(timeAgo(Date.parse('2025-12-25T12:00:00Z'), now)).toBe('Dec 25, 2025');
        expect(timeAgo(null, now)).toBe('');
    });
});

describe('parseVerseKey', () => {
    it('parses valid keys', () => {
        expect(parseVerseKey('2:255')).toEqual({ chapterId: 2, ayahNumber: 255 });
    });
    it('returns nulls for junk', () => {
        expect(parseVerseKey('nope')).toEqual({ chapterId: null, ayahNumber: null });
        expect(parseVerseKey('')).toEqual({ chapterId: null, ayahNumber: null });
    });
});

describe('pageForAyah', () => {
    it('maps ayah number to API page', () => {
        expect(pageForAyah(1)).toBe(1);
        expect(pageForAyah(50)).toBe(1);
        expect(pageForAyah(51)).toBe(2);
        expect(pageForAyah(255)).toBe(6);
        expect(pageForAyah('bad')).toBe(1);
    });
});

describe('bookmark matching + search', () => {
    const resolver = (id) => (id === 2 ? 'Al-Baqara' : null);
    it('matches by surah name, key, ayah number and prefixes', () => {
        const b = bm('2:255', 'Al-Baqara', 2);
        expect(matchesBookmark(b, 'baqara', resolver)).toBe(true);
        expect(matchesBookmark(b, 'AL-BAQARA', resolver)).toBe(true);
        expect(matchesBookmark(b, '2:255', resolver)).toBe(true);
        expect(matchesBookmark(b, '255', resolver)).toBe(true);
        expect(matchesBookmark(b, 'ayah 255', resolver)).toBe(true);
        expect(matchesBookmark(b, 'surah 2', resolver)).toBe(true);
        expect(matchesBookmark(b, 'yasin', resolver)).toBe(false);
        expect(matchesBookmark(b, '   ', resolver)).toBe(true);
    });
    it('searchBookmarks filters and returns input for empty query', () => {
        const list = [bm('2:255', 'Al-Baqara', 2), bm('36:1', 'Yasin', 36)];
        expect(searchBookmarks(list, '', resolver)).toBe(list);
        expect(searchBookmarks(list, 'yas', resolver)).toHaveLength(1);
        expect(searchBookmarks(list, '999', resolver)).toHaveLength(0);
    });
});

describe('sortBookmarks', () => {
    const list = [
        bm('36:5', 'Yasin', 36, 100),
        bm('2:255', 'Al-Baqara', 2, 300),
        bm('1:1', 'Al-Fatihah', 1),
    ];
    it('recent: createdAt desc, insertion order for missing', () => {
        const out = sortBookmarks(list, 'recent');
        expect(out.map((b) => b.verseKey)).toEqual(['2:255', '36:5', '1:1']);
    });
    it('surah: chapter then ayah', () => {
        const out = sortBookmarks(list, 'surah');
        expect(out.map((b) => b.verseKey)).toEqual(['1:1', '2:255', '36:5']);
    });
    it('ayah: surah name alphabetically', () => {
        const out = sortBookmarks(list, 'ayah');
        expect(out.map((b) => b.verseKey)).toEqual(['2:255', '1:1', '36:5']); // Al-Baqara, Al-Fatihah, Yasin
    });
    it('does not mutate input', () => {
        const before = list.map((b) => b.verseKey);
        sortBookmarks(list, 'surah');
        expect(list.map((b) => b.verseKey)).toEqual(before);
    });
});

describe('groupBySurah', () => {
    it('groups by chapter in Quran order', () => {
        const items = [
            { verseKey: '36:2', surahName: 'Yasin', chapterId: 36 },
            { verseKey: '2:255', surahName: 'Al-Baqara', chapterId: 2 },
            { verseKey: '2:256', surahName: 'Al-Baqara', chapterId: 2 },
        ];
        const groups = groupBySurah(items);
        expect(groups).toHaveLength(2);
        expect(groups[0].chapterId).toBe(2);
        expect(groups[0].items).toHaveLength(2);
        expect(groups[1].surahName).toBe('Yasin');
    });
});

describe('collections', () => {
    const collections = [
        { id: 1, name: 'Morning Adhkar', items: [{ verseKey: '2:255', surahName: 'Al-Baqara', chapterId: 2 }] },
        { id: 2, name: 'Tawbah', items: [] },
    ];
    it('searches by name and by contained surah', () => {
        expect(searchCollections(collections, 'morning')).toHaveLength(1);
        expect(searchCollections(collections, 'baqara')).toHaveLength(1);
        expect(searchCollections(collections, 'nothing')).toHaveLength(0);
        expect(searchCollections(collections, '')).toBe(collections);
    });
    it('stats count verses and distinct surahs', () => {
        expect(collectionStats(collections[0])).toEqual({ verseCount: 1, surahCount: 1 });
        expect(collectionStats(collections[1])).toEqual({ verseCount: 0, surahCount: 0 });
    });
});

describe('validateCollectionName', () => {
    it('rejects empty and long names', () => {
        expect(validateCollectionName('')).toBeTruthy();
        expect(validateCollectionName('   ')).toBeTruthy();
        expect(validateCollectionName('x'.repeat(61))).toBeTruthy();
    });
    it('rejects duplicates but allows the collection\'s own name on rename', () => {
        expect(validateCollectionName('Duas', { existingNames: ['Duas'] })).toBeTruthy();
        expect(validateCollectionName('Duas', { existingNames: ['Duas'], ignoreName: 'Duas' })).toBeNull();
        expect(validateCollectionName('New', { existingNames: ['Duas'] })).toBeNull();
    });
});
