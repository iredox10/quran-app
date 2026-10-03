import { describe, it, expect } from 'vitest';
import {
    isValidVerseKey,
    versePreviewQueryKey,
    buildVersePreviewParams,
    extractVerse,
    stripTranslationHtml,
    extractVerseText,
    VERSE_PREVIEW_PER_PAGE,
    VERSE_PREVIEW_TRANSLATION_ID,
    VERSE_PREVIEW_MUSHAF_ID,
} from './verseLookup';

describe('isValidVerseKey', () => {
    it('accepts well-formed keys', () => {
        expect(isValidVerseKey('1:1')).toBe(true);
        expect(isValidVerseKey('2:255')).toBe(true);
        expect(isValidVerseKey('114:6')).toBe(true);
        expect(isValidVerseKey('2:286')).toBe(true);
        expect(isValidVerseKey('  2:255  ')).toBe(true);
    });

    it('rejects malformed keys', () => {
        expect(isValidVerseKey('')).toBe(false);
        expect(isValidVerseKey('   ')).toBe(false);
        expect(isValidVerseKey('2')).toBe(false);
        expect(isValidVerseKey('2:')).toBe(false);
        expect(isValidVerseKey(':255')).toBe(false);
        expect(isValidVerseKey('abc')).toBe(false);
        expect(isValidVerseKey('2:255abc')).toBe(false);
        expect(isValidVerseKey('2:255:1')).toBe(false);
        expect(isValidVerseKey('2:255:')).toBe(false);
        expect(isValidVerseKey('2 :255')).toBe(false);
        expect(isValidVerseKey('2:-5')).toBe(false);
    });

    it('rejects out-of-range chapters/ayahs', () => {
        expect(isValidVerseKey('0:1')).toBe(false);
        expect(isValidVerseKey('1:0')).toBe(false);
        expect(isValidVerseKey('115:1')).toBe(false);
        expect(isValidVerseKey('2:287')).toBe(false);
        expect(isValidVerseKey('00:1')).toBe(false);
    });

    it('rejects nullish and non-string input', () => {
        expect(isValidVerseKey(null)).toBe(false);
        expect(isValidVerseKey(undefined)).toBe(false);
        expect(isValidVerseKey(42)).toBe(false);
        expect(isValidVerseKey({})).toBe(false);
    });
});

describe('versePreviewQueryKey', () => {
    it('builds the fixed key shape', () => {
        expect(versePreviewQueryKey(2, '2:255')).toEqual(['verse-preview', 2, '2:255']);
    });

    it('normalizes chapter ids', () => {
        expect(versePreviewQueryKey('2', '2:255')).toEqual(['verse-preview', 2, '2:255']);
        expect(versePreviewQueryKey(undefined, '2:255')).toEqual(['verse-preview', null, '2:255']);
        expect(versePreviewQueryKey(null, '2:255')).toEqual(['verse-preview', null, '2:255']);
        expect(versePreviewQueryKey('abc', '2:255')).toEqual(['verse-preview', null, '2:255']);
        expect(versePreviewQueryKey(2.5, '2:255')).toEqual(['verse-preview', null, '2:255']);
        expect(versePreviewQueryKey(-1, '2:255')).toEqual(['verse-preview', null, '2:255']);
    });

    it('normalizes the verse key', () => {
        expect(versePreviewQueryKey(2, ' 2:255 ')).toEqual(['verse-preview', 2, '2:255']);
        expect(versePreviewQueryKey(2, null)).toEqual(['verse-preview', 2, '']);
        expect(versePreviewQueryKey(2, undefined)).toEqual(['verse-preview', 2, '']);
    });
});

describe('buildVersePreviewParams', () => {
    it('maps ayah numbers to API pages (50 per page)', () => {
        expect(VERSE_PREVIEW_PER_PAGE).toBe(50);
        expect(buildVersePreviewParams('1:1').page).toBe(1);
        expect(buildVersePreviewParams('2:50').page).toBe(1);
        expect(buildVersePreviewParams('2:51').page).toBe(2);
        expect(buildVersePreviewParams('2:255').page).toBe(6);
        expect(buildVersePreviewParams('2:286').page).toBe(6);
        expect(buildVersePreviewParams('114:6').page).toBe(1);
    });

    it('returns chapter/ayah plus the fixed fetch options', () => {
        const params = buildVersePreviewParams('2:255');
        expect(params).toEqual({
            chapterId: 2,
            ayahNumber: 255,
            page: 6,
            perPage: 50,
            translationId: 85,
            reciterId: 7,
            mushafId: 'madani-standard',
        });
        expect(params.translationId).toBe(VERSE_PREVIEW_TRANSLATION_ID);
        expect(params.mushafId).toBe(VERSE_PREVIEW_MUSHAF_ID);
    });

    it('honours a custom perPage', () => {
        expect(buildVersePreviewParams('2:25', { perPage: 10 }).page).toBe(3);
        expect(buildVersePreviewParams('2:10', { perPage: 10 }).page).toBe(1);
        expect(buildVersePreviewParams('2:25', { perPage: 10 }).perPage).toBe(10);
    });

    it('falls back to the default perPage for junk values', () => {
        expect(buildVersePreviewParams('2:255', { perPage: 0 }).perPage).toBe(50);
        expect(buildVersePreviewParams('2:255', { perPage: -5 }).perPage).toBe(50);
        expect(buildVersePreviewParams('2:255', { perPage: 'x' }).perPage).toBe(50);
        expect(buildVersePreviewParams('2:255', { perPage: 7.9 }).perPage).toBe(7);
        expect(buildVersePreviewParams('2:255', { perPage: 7.9 }).page).toBe(37);
    });

    it('returns null for invalid keys', () => {
        expect(buildVersePreviewParams('')).toBeNull();
        expect(buildVersePreviewParams('nope')).toBeNull();
        expect(buildVersePreviewParams('0:1')).toBeNull();
        expect(buildVersePreviewParams(null)).toBeNull();
        expect(buildVersePreviewParams(undefined)).toBeNull();
    });
});

describe('extractVerse', () => {
    const verses = [
        { verse_key: '2:254', text_uthmani: 'a' },
        { verse_key: '2:255', text_uthmani: 'b' },
        { verse_key: '2:256', text_uthmani: 'c' },
    ];

    it('finds the verse with the matching key', () => {
        expect(extractVerse(verses, '2:255')).toEqual({ verse_key: '2:255', text_uthmani: 'b' });
    });

    it('trims the needle', () => {
        expect(extractVerse(verses, ' 2:256 ')).toEqual({ verse_key: '2:256', text_uthmani: 'c' });
    });

    it('returns null when missing', () => {
        expect(extractVerse(verses, '2:257')).toBeNull();
        expect(extractVerse([], '2:255')).toBeNull();
    });

    it('never throws on junk input', () => {
        expect(extractVerse(null, '2:255')).toBeNull();
        expect(extractVerse(undefined, '2:255')).toBeNull();
        expect(extractVerse('nope', '2:255')).toBeNull();
        expect(extractVerse([{ verse_key: '2:255' }], null)).toBeNull();
        expect(extractVerse([{ verse_key: '2:255' }], '')).toBeNull();
        expect(extractVerse([null, undefined, { verse_key: '2:255' }], '2:255')).toEqual({ verse_key: '2:255' });
    });
});

describe('stripTranslationHtml', () => {
    it('removes footnote markers and tags', () => {
        expect(stripTranslationHtml('<sup foot_note="12">12</sup>God is One!')).toBe('God is One!');
        expect(stripTranslationHtml('Believe <span class="x">in</span> God')).toBe('Believe in God');
        expect(stripTranslationHtml('line<br/>break')).toBe('line break');
    });

    it('decodes common entities', () => {
        expect(stripTranslationHtml('the &quot;straight path&quot;')).toBe('the "straight path"');
        expect(stripTranslationHtml('Qur&#39;an &amp; guidance')).toBe("Qur'an & guidance");
        expect(stripTranslationHtml('Rabbunā&#x2019;')).toBe('Rabbunā’');
        expect(stripTranslationHtml('&amp;amp;')).toBe('&amp;');
    });

    it('leaves unknown entities and empty input alone', () => {
        expect(stripTranslationHtml('&unknown;')).toBe('&unknown;');
        expect(stripTranslationHtml('')).toBe('');
        expect(stripTranslationHtml(null)).toBe('');
        expect(stripTranslationHtml(undefined)).toBe('');
    });

    it('collapses stray whitespace/newlines', () => {
        expect(stripTranslationHtml('  a\n\n  b  ')).toBe('a b');
    });
});

describe('extractVerseText', () => {
    it('returns null for non-objects', () => {
        expect(extractVerseText(null)).toBeNull();
        expect(extractVerseText(undefined)).toBeNull();
        expect(extractVerseText('text')).toBeNull();
    });

    it('reads arabic_text (decorated by getVerses) with problem chars removed', () => {
        const verse = { arabic_text: 'بِسْمِ ٱللَّهِ \u06eaٱلرَّحْمَٰنِ' };
        expect(extractVerseText(verse).arabic).toBe('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ');
        expect(extractVerseText(verse).translation).toBe('');
    });

    it('falls back to text fields and words when arabic_text is absent', () => {
        expect(extractVerseText({ text_uthmani: 'الحمد لله' }).arabic).toBe('الحمد لله');
        expect(extractVerseText({ text_qpc_hafs: 'الحمد' }).arabic).toBe('الحمد');
        expect(
            extractVerseText({ words: [{ text_uthmani: 'ٱلْحَمْدُ' }, { text: 'لِلَّهِ' }] }).arabic
        ).toBe('ٱلْحَمْدُ لِلَّهِ');
        expect(extractVerseText({}).arabic).toBe('');
    });

    it('reads the first translation, stripped to plain text', () => {
        const verse = {
            arabic_text: 'الحمد لله',
            translations: [{ id: 85, text: '<sup foot_note="1">1</sup>Praise be to God, Lord of all the worlds,' }],
        };
        expect(extractVerseText(verse)).toEqual({
            arabic: 'الحمد لله',
            translation: 'Praise be to God, Lord of all the worlds,',
        });
    });

    it('tolerates missing/malformed translations', () => {
        expect(extractVerseText({ arabic_text: 'x' }).translation).toBe('');
        expect(extractVerseText({ arabic_text: 'x', translations: 'nope' }).translation).toBe('');
        expect(extractVerseText({ arabic_text: 'x', translations: [null] }).translation).toBe('');
    });
});
