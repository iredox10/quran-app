import { describe, it, expect } from 'vitest';
import { MUSHAFS, SELECTABLE_MUSHAFS, DEFAULT_MUSHAF, getMushafById, getCompatibleArabicFontId, isTajweedEnabledForMushaf } from './mushaf';

describe('offline mushaf catalog', () => {
    it('recognizes the Uthmani edition synced from Android with its actual script', () => {
        const selected = getMushafById('uthmani-hafs');
        expect(selected.verseField).toBe('text_uthmani');
        expect(selected.defaultFontId).toBe('amiri-quran');
        expect(selected.apiMushafId).toBe(4);
    });
    it('offers only complete offline presentations and migrates unsupported legacy IndoPak safely', () => {
        expect(SELECTABLE_MUSHAFS.map(m => m.id)).toEqual(['madani-standard', 'madani-tajweed', 'uthmani-hafs']);
        expect(MUSHAFS.find(m => m.id === 'indopak').isSelectable).toBe(false);
        expect(getMushafById('indopak')).toBe(DEFAULT_MUSHAF);
        expect(SELECTABLE_MUSHAFS.every(m => m.pageCount === 604 && m.renderMode === 'unicode')).toBe(true);
    });
    it('keeps the same QPC text for colored rules and uses complete fonts', () => {
        expect(getMushafById('madani-tajweed').apiMushafId).toBe(5);
        expect(isTajweedEnabledForMushaf('madani-tajweed', false)).toBe(true);
        expect(getCompatibleArabicFontId('madani-standard', 'uthman-taha-naskh')).toBe('kfgqpc-hafs');
        expect(getCompatibleArabicFontId('uthmani-hafs', null)).toBe('amiri-quran');
    });
});
