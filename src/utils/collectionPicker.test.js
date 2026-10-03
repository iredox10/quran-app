import { describe, it, expect } from 'vitest';
import {
    pickerRows,
    existingCollectionNames,
    validateNewCollectionName,
    verseContext,
    addedNotice,
    removedNotice,
    savedCount,
} from './collectionPicker';

const col = (id, name, verseKeys = []) => ({
    id,
    name,
    items: verseKeys.map((verseKey) => ({ verseKey, surahName: 'Al-Baqarah', chapterId: 2 })),
});

describe('pickerRows', () => {
    it('flags rows that already contain the verse (dedupe / saved state)', () => {
        const rows = pickerRows(
            [col(1, 'Favorites', ['2:255', '1:1']), col(2, 'To review', ['1:5'])],
            '2:255'
        );
        expect(rows.map((r) => [r.name, r.verseCount, r.contains])).toEqual([
            ['Favorites', 2, true],
            ['To review', 1, false],
        ]);
    });

    it('keeps the original collection object for onAdded callbacks', () => {
        const original = col(7, 'Morning', ['1:1']);
        const [row] = pickerRows([original], '9:9');
        expect(row.id).toBe(7);
        expect(row.collection).toBe(original);
    });

    it('never marks contains when the verse key is missing or empty', () => {
        const rows = pickerRows([col(1, 'A', [''])], null);
        expect(rows[0].contains).toBe(false);
        expect(pickerRows([col(1, 'A', ['1:1'])], '')[0].contains).toBe(false);
    });

    it('tolerates null / non-array collections and partial entries', () => {
        expect(pickerRows(null)).toEqual([]);
        expect(pickerRows('nope')).toEqual([]);
        const rows = pickerRows([null, { id: 3, name: null }, { name: 'no id', items: null }], '1:1');
        expect(rows).toEqual([
            expect.objectContaining({ id: 3, name: '', verseCount: 0, contains: false }),
            expect.objectContaining({ id: undefined, name: 'no id', verseCount: 0, contains: false }),
        ]);
    });
});

describe('existingCollectionNames', () => {
    it('collects non-empty names only', () => {
        expect(existingCollectionNames([col(1, 'A'), { id: 2 }, null, col(3, '')])).toEqual(['A']);
        expect(existingCollectionNames(undefined)).toEqual([]);
    });
});

describe('validateNewCollectionName', () => {
    const collections = [col(1, 'Favorites'), col(2, 'To review')];

    it('rejects a duplicate name case-insensitively', () => {
        expect(validateNewCollectionName('  favorites ', collections)).toBe(
            'A collection with that name already exists'
        );
    });

    it('accepts a fresh trimmed name', () => {
        expect(validateNewCollectionName('  New name  ', collections)).toBeNull();
    });

    it('rejects empty and over-long names via library validation', () => {
        expect(validateNewCollectionName('   ', collections)).toBe('Name cannot be empty');
        expect(validateNewCollectionName('x'.repeat(61), collections)).toBe(
            'Name is too long (max 60 characters)'
        );
    });

    it('works with no collections yet', () => {
        expect(validateNewCollectionName('First', [])).toBeNull();
        expect(validateNewCollectionName('', [])).toBe('Name cannot be empty');
    });
});

describe('verseContext', () => {
    it('builds the header label from surah name + ayah number', () => {
        expect(verseContext({ verseKey: '2:255', surahName: 'Al-Baqarah', chapterId: 2 })).toEqual({
            surahName: 'Al-Baqarah',
            chapterId: 2,
            ayah: 255,
            label: 'Al-Baqarah · Ayah 255',
        });
    });

    it('never throws on partial or missing verse objects', () => {
        expect(() => verseContext(null)).not.toThrow();
        expect(() => verseContext(undefined)).not.toThrow();
        expect(() => verseContext({})).not.toThrow();
        expect(() => verseContext({ verseKey: 'garbage' })).not.toThrow();
        expect(verseContext({}).label).toBe('');
        expect(verseContext({ verseKey: 'bad' }).chapterId).toBeNull();
        expect(verseContext(undefined).ayah).toBeNull();
    });
});

describe('notices + savedCount', () => {
    it('names the collection, falling back safely', () => {
        expect(addedNotice('Favorites')).toBe('Added to “Favorites”');
        expect(removedNotice('')).toBe('Removed from “collection”');
        expect(addedNotice(null)).toBe('Added to “collection”');
    });

    it('counts rows that contain the verse', () => {
        const rows = pickerRows([col(1, 'A', ['1:1']), col(2, 'B', ['2:2'])], '1:1');
        expect(savedCount(rows)).toBe(1);
        expect(savedCount([])).toBe(0);
        expect(savedCount(undefined)).toBe(0);
    });
});
