import { describe, it, expect } from 'vitest';
import { MUSHAFS, SELECTABLE_MUSHAFS, DEFAULT_MUSHAF, resolveMushafSettings, getArabicFontFamily, getMushafById, getCompatibleArabicFontId, isTajweedEnabledForMushaf } from './mushaf';

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

describe('font restoration and cross-device settings', () => {
    it('uses Madani QPC text and font when no choice is stored', () => {
        expect(resolveMushafSettings()).toEqual({mushafId:'madani-standard',arabicFontId:'kfgqpc-hafs',arabicFont:getArabicFontFamily('kfgqpc-hafs')});
    });
    it('converts the Android display name to a real bundled web font family', () => {
        const restored = resolveMushafSettings({}, {mushafId:'madani-standard',arabicFontId:'kfgqpc-hafs',arabicFont:'KFGQPC Hafs'});
        expect(restored.arabicFont).toContain('KFGQPC Hafs Uthmanic Script');
        expect(restored.arabicFont).not.toBe('KFGQPC Hafs');
    });
    it('recognizes legacy display-name-only font preferences', () => {
        expect(resolveMushafSettings({}, {arabicFont:'KFGQPC Hafs'}).arabicFontId).toBe('kfgqpc-hafs');
        expect(resolveMushafSettings({}, {arabicFont:'Amiri Quran'}).arabicFont).toContain('Quran Nur Amiri');
    });
    it('resolves a new edition to its matching preview font', () => {
        expect(resolveMushafSettings({mushafId:'madani-standard',arabicFontId:'kfgqpc-hafs'}, {mushafId:'uthmani-hafs'}).arabicFontId).toBe('amiri-quran');
    });
});
