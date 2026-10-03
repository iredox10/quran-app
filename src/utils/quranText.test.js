import { describe, it, expect } from 'vitest';
import {
    cleanArabicText,
    getWordArabicText,
    getVerseArabicText,
    sanitizeTajweedHtml,
} from './quranText';

const WAQF_WORD = 'فَٱتَّقُوا۟'; // ends with U+06DF (Arabic Small High Rounded Zero)

describe('cleanArabicText', () => {
    it('strips U+06DF and the U+06EA-EC stop marks', () => {
        expect(cleanArabicText('a\u06dfb')).toBe('ab');
        expect(cleanArabicText('a\u06eab')).toBe('ab');
        expect(cleanArabicText('a\u06ebb')).toBe('ab');
        expect(cleanArabicText('a\u06ecb')).toBe('ab');
        expect(cleanArabicText('بِسْمِ \u06dfٱللَّهِ')).toBe('بِسْمِ ٱللَّهِ');
    });

    it('preserves sala (U+06D6), small waw (U+06E5) and dotless khah head (U+06E1)', () => {
        const kept = 'a\u06d6b\u06e5c\u06e1d';
        expect(cleanArabicText(kept)).toBe(kept);
    });

    it('passes null/empty through unchanged', () => {
        expect(cleanArabicText(null)).toBeNull();
        expect(cleanArabicText(undefined)).toBeUndefined();
        expect(cleanArabicText('')).toBe('');
    });
});

describe('getWordArabicText', () => {
    it('uses the mushaf scriptField when present', () => {
        const word = { text_qpc_hafs: 'hafs text', text_uthmani: 'uthmani text' };
        expect(getWordArabicText(word, { scriptField: 'text_qpc_hafs' })).toBe('hafs text');
    });

    it('falls back to text_uthmani when mushaf is undefined, a string, or unknown', () => {
        const word = { text_uthmani: 'u\u06df', text_indopak: 'i' };
        expect(getWordArabicText(word, undefined)).toBe('u');
        expect(getWordArabicText(word, 'madani-standard')).toBe('u');
        expect(getWordArabicText(word, { scriptField: 'nope' })).toBe('u');
        expect(getWordArabicText(word, {})).toBe('u');
    });

    it('continues the chain to text_indopak, text_qpc_hafs and text', () => {
        expect(getWordArabicText({ text_indopak: 'i\u06df' })).toBe('i');
        expect(getWordArabicText({ text_qpc_hafs: 'q\u06df' })).toBe('q');
        expect(getWordArabicText({ text: 't\u06df' })).toBe('t');
        expect(getWordArabicText({})).toBe('');
    });

    it('returns empty string for a null/undefined word', () => {
        expect(getWordArabicText(null, { scriptField: 'text_uthmani' })).toBe('');
        expect(getWordArabicText(undefined)).toBe('');
    });

    it('drops U+06DF from the realistic waqf word but keeps the rest intact', () => {
        expect(WAQF_WORD).toContain('\u06df');
        const out = getWordArabicText({ text_uthmani: WAQF_WORD }, { scriptField: 'text_uthmani' });
        expect(out).not.toContain('\u06df');
        expect(out).toBe('فَٱتَّقُوا');
    });
});

describe('getVerseArabicText', () => {
    it('prefers verse.arabic_text, cleaned', () => {
        const verse = { arabic_text: 'a\u06dfb', text_uthmani: 'other', words: [{ text: 'w' }] };
        expect(getVerseArabicText(verse, { verseField: 'text_indopak' })).toBe('ab');
    });

    it('uses mushaf.verseField when arabic_text is absent', () => {
        const verse = { text_qpc_hafs: 'field\u06df', text_uthmani: 'u', words: [{ text: 'w' }] };
        expect(getVerseArabicText(verse, { verseField: 'text_qpc_hafs' })).toBe('field');
        // no matching verseField -> drops through to the words branch
        expect(getVerseArabicText(verse, undefined)).toBe('w');
        expect(getVerseArabicText(verse, { verseField: 'missing' })).toBe('w');
    });

    it('joins word texts when no verse-level field applies', () => {
        const verse = {
            words: [{ text_uthmani: 'ٱلْحَمْدُ' }, { text: 'لِلَّهِ' }, { text_uthmani: 'x\u06df' }, {}],
        };
        expect(getVerseArabicText(verse)).toBe('ٱلْحَمْدُ لِلَّهِ x');
    });

    it('falls back through text_uthmani, text_indopak, text_qpc_hafs', () => {
        expect(getVerseArabicText({ text_uthmani: 'u\u06df', text_indopak: 'i' })).toBe('u');
        expect(getVerseArabicText({ text_indopak: 'i\u06df' })).toBe('i');
        expect(getVerseArabicText({ text_qpc_hafs: 'q\u06df' })).toBe('q');
        expect(getVerseArabicText({ words: [] })).toBe('');
        expect(getVerseArabicText({})).toBe('');
    });

    it('returns empty string for a null/undefined verse', () => {
        expect(getVerseArabicText(null)).toBe('');
        expect(getVerseArabicText(undefined, { verseField: 'text_uthmani' })).toBe('');
    });
});

describe('sanitizeTajweedHtml', () => {
    it('renames rule tags to tajweed', () => {
        expect(sanitizeTajweedHtml('<rule class=ikhafa>x</rule>')).toBe('<tajweed class=ikhafa>x</tajweed>');
        expect(sanitizeTajweedHtml('<rule id="a">x</rule>')).toBe('<tajweed id="a">x</tajweed>');
    });

    it('strips U+06DF and U+06EA-EC', () => {
        expect(sanitizeTajweedHtml('a\u06dfb\u06eac\u06ebd\u06ece')).toBe('abcde');
    });

    it('maps U+0672 to U+0670', () => {
        expect(sanitizeTajweedHtml('x\u0672y')).toBe('x\u0670y');
        expect(sanitizeTajweedHtml('\u0672')).toBe('\u0670');
    });

    it('returns empty string for empty/null input', () => {
        expect(sanitizeTajweedHtml('')).toBe('');
        expect(sanitizeTajweedHtml(null)).toBe('');
        expect(sanitizeTajweedHtml(undefined)).toBe('');
    });

    it('sanitizes realistic tajweed html containing the waqf word', () => {
        expect(sanitizeTajweedHtml(`<rule class=ikhafa>${WAQF_WORD}</rule>`)).toBe(
            '<tajweed class=ikhafa>فَٱتَّقُوا</tajweed>'
        );
    });
});
