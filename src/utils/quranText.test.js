import { describe, it, expect } from 'vitest';
import {
    cleanArabicText,
    getWordArabicText,
    getVerseArabicText,
    sanitizeTajweedHtml,
} from './quranText';

const SAKTAH_WORD = 'فَٱتَّقُو۟'; // ends with U+06DF (Arabic Small High Rounded Zero / saktah)

describe('cleanArabicText', () => {
    it('keeps every Quranic annotation sign — the app must be sign-complete', () => {
        const signs = [
            0x6d6, 0x6d7, 0x6d8, 0x6d9, 0x6da, 0x6db, 0x6dc, // small high ligature..rounded zero
            0x6dd, // end-of-ayah frame
            0x6de, // sajda
            0x6df, // saktah / small high rounded zero
            0x6e0, 0x6e1, 0x6e2, 0x6e3, 0x6e4,
            0x6e5, 0x6e6, // small waw / small ya
            0x6e7, 0x6e8, 0x6e9, // small high ya / noon
            0x6ea, // imalah
            0x6eb, // ishmam
            0x6ec, // rounded high stop with filled centre
            0x6ed, // small low meem
            0x614, 0x615, // IndoPak extended marks
            0xfd3e, 0xfd3f, // ornate parentheses
            0x64b, 0x64e, 0x650, 0x651, 0x652, 0x670, // harakat + superscript alef
        ];
        for (const cp of signs) {
            expect(cleanArabicText(`a${String.fromCodePoint(cp)}`)).toBe(
                `a${String.fromCodePoint(cp)}`
            );
        }
    });

    it('strips only the U+25CC dotted-circle placeholder', () => {
        expect(cleanArabicText('a\u25ccb')).toBe('ab');
        expect(cleanArabicText('بِسْمِ \u25ccٱللَّهِ')).toBe('بِسْمِ ٱللَّهِ');
    });

    it('keeps saktah/imalah/ishmam/end-frame/sajda inside realistic verse text', () => {
        const sample = 'كِتَٰبٌ۟\u06ea\u06eb\u06ec\u06dd\u06de';
        const signs = [0x6df, 0x6ea, 0x6eb, 0x6ec, 0x6dd, 0x6de].map((cp) =>
            String.fromCodePoint(cp)
        );
        const out = cleanArabicText(sample);
        for (const sign of signs) {
            expect(out).toContain(sign);
        }
        expect(out).not.toContain('\u25cc');
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
        expect(getWordArabicText(word, undefined)).toBe('u\u06df');
        expect(getWordArabicText(word, 'madani-standard')).toBe('u\u06df');
        expect(getWordArabicText(word, { scriptField: 'nope' })).toBe('u\u06df');
        expect(getWordArabicText(word, {})).toBe('u\u06df');
    });

    it('continues the chain to text_indopak, text_qpc_hafs and text', () => {
        expect(getWordArabicText({ text_indopak: 'i\u06df' })).toBe('i\u06df');
        expect(getWordArabicText({ text_qpc_hafs: 'q\u06df' })).toBe('q\u06df');
        expect(getWordArabicText({ text: 't\u06df' })).toBe('t\u06df');
        expect(getWordArabicText({})).toBe('');
    });

    it('returns empty string for a null/undefined word', () => {
        expect(getWordArabicText(null, { scriptField: 'text_uthmani' })).toBe('');
        expect(getWordArabicText(undefined)).toBe('');
    });

    it('keeps the saktah sign of the realistic waqf word intact', () => {
        expect(SAKTAH_WORD).toContain('\u06df');
        const out = getWordArabicText({ text_uthmani: SAKTAH_WORD }, { scriptField: 'text_uthmani' });
        expect(out).toBe(SAKTAH_WORD);
    });
});

describe('getVerseArabicText', () => {
    it('prefers verse.arabic_text', () => {
        const verse = { arabic_text: 'a\u06dfb', text_uthmani: 'other', words: [{ text: 'w' }] };
        expect(getVerseArabicText(verse, { verseField: 'text_indopak' })).toBe('a\u06dfb');
    });

    it('uses mushaf.verseField when arabic_text is absent', () => {
        const verse = { text_qpc_hafs: 'field\u06df', text_uthmani: 'u', words: [{ text: 'w' }] };
        expect(getVerseArabicText(verse, { verseField: 'text_qpc_hafs' })).toBe('field\u06df');
        // no matching verseField -> drops through to the words branch
        expect(getVerseArabicText(verse, undefined)).toBe('w');
        expect(getVerseArabicText(verse, { verseField: 'missing' })).toBe('w');
    });

    it('joins word texts when no verse-level field applies', () => {
        const verse = {
            words: [{ text_uthmani: 'ٱلْحَمْدُ' }, { text: 'لِلَّهِ' }, { text_uthmani: 'x\u06df' }, {}],
        };
        expect(getVerseArabicText(verse)).toBe('ٱلْحَمْدُ لِلَّهِ x\u06df');
    });

    it('falls back through text_uthmani, text_indopak, text_qpc_hafs', () => {
        expect(getVerseArabicText({ text_uthmani: 'u\u06df', text_indopak: 'i' })).toBe('u\u06df');
        expect(getVerseArabicText({ text_indopak: 'i\u06df' })).toBe('i\u06df');
        expect(getVerseArabicText({ text_qpc_hafs: 'q\u06df' })).toBe('q\u06df');
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

    it('keeps Quranic signs inside tajweed html', () => {
        expect(sanitizeTajweedHtml('a\u06dfb\u06eac\u06ebd\u06ece\u06dd')).toContain('\u06df');
        expect(sanitizeTajweedHtml('a\u06dfb\u06eac\u06ebd\u06ece\u06dd')).toContain('\u06dd');
    });

    it('strips the dotted-circle placeholder from tajweed html', () => {
        expect(sanitizeTajweedHtml('a\u25ccb')).toBe('ab');
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

    it('sanitizes realistic tajweed html containing the saktah word', () => {
        expect(sanitizeTajweedHtml(`<rule class=ikhafa>${SAKTAH_WORD}</rule>`)).toBe(
            `<tajweed class=ikhafa>${SAKTAH_WORD}</tajweed>`
        );
    });
});
