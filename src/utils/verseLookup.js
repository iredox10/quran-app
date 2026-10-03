/**
 * verseLookup.js — pure helpers behind the shared VersePreview component.
 * No React, no network: everything takes plain data so it is trivially
 * testable (see verseLookup.test.js).
 *
 * A VersePreview renders ONE ayah pulled from a paginated chapter fetch:
 *   verseKey '2:255' -> parse it -> page 6 of surah 2 (50 ayahs/page)
 *   -> getVerses(...) -> find the verse -> extract Arabic + translation.
 */

import { parseVerseKey, pageForAyah } from './library';
import { getVerseArabicText } from './quranText';

/** API pagination size — kept at 50 to stay within Quran.com limits. */
export const VERSE_PREVIEW_PER_PAGE = 50;
/** Default translation (M.A.S. Abdel Haleem) used across the app. */
export const VERSE_PREVIEW_TRANSLATION_ID = 85;
export const VERSE_PREVIEW_RECITER_ID = 7;
export const VERSE_PREVIEW_MUSHAF_ID = 'madani-standard';

const VERSE_KEY_RE = /^\d{1,3}:\d{1,3}$/;
const MAX_CHAPTER_ID = 114;
const MAX_AYAH_NUMBER = 286;

const SUP_RE = /<sup[^>]*>[\s\S]*?<\/sup>/gi;
const TAG_RE = /<[^>]*>/g;
const ENTITY_RE = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g;
const NAMED_ENTITIES = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    mdash: '—',
    ndash: '–',
    hellip: '…',
};

/** `'2:255'` (trimmed) is valid; `''`, `'2'`, `'0:1'`, `'115:1'`, `'2:287'`, `'abc'`, numbers, null… are not. */
export function isValidVerseKey(verseKey) {
    if (verseKey == null) return false;
    const raw = String(verseKey).trim();
    if (!VERSE_KEY_RE.test(raw)) return false;
    const { chapterId, ayahNumber } = parseVerseKey(raw);
    if (chapterId === null || ayahNumber === null) return false;
    if (chapterId < 1 || chapterId > MAX_CHAPTER_ID) return false;
    if (ayahNumber < 1 || ayahNumber > MAX_AYAH_NUMBER) return false;
    return true;
}

/** React Query key for one preview: `['verse-preview', chapterId, verseKey]` (normalized). */
export function versePreviewQueryKey(chapterId, verseKey) {
    const chapter = Number(chapterId);
    const normalizedChapter = Number.isInteger(chapter) && chapter > 0 ? chapter : null;
    const key = verseKey == null ? '' : String(verseKey).trim();
    return ['verse-preview', normalizedChapter, key];
}

/**
 * Everything `getVerses` needs to fetch the page containing `verseKey`, or
 * null when the key is invalid. `perPage` is clamped to a sane integer so
 * page math can never produce Infinity/NaN.
 *
 *   buildVersePreviewParams('2:255') -> page 6 of surah 2
 */
export function buildVersePreviewParams(verseKey, { perPage = VERSE_PREVIEW_PER_PAGE } = {}) {
    if (!isValidVerseKey(verseKey)) return null;
    const size = Number(perPage);
    const safePerPage = Number.isFinite(size) && size >= 1 ? Math.floor(size) : VERSE_PREVIEW_PER_PAGE;
    const { chapterId, ayahNumber } = parseVerseKey(String(verseKey).trim());
    return {
        chapterId,
        ayahNumber,
        page: pageForAyah(ayahNumber, safePerPage),
        perPage: safePerPage,
        translationId: VERSE_PREVIEW_TRANSLATION_ID,
        reciterId: VERSE_PREVIEW_RECITER_ID,
        mushafId: VERSE_PREVIEW_MUSHAF_ID,
    };
}

/** Find one verse inside a fetched page — tolerant of junk input, never throws. */
export function extractVerse(verses, verseKey) {
    if (!Array.isArray(verses) || verseKey == null) return null;
    const target = String(verseKey).trim();
    if (!target) return null;
    return verses.find((verse) => verse && String(verse.verse_key ?? '').trim() === target) || null;
}

/** Strip footnote markers/tags from translation HTML and decode entities for plain-text rendering. */
export function stripTranslationHtml(text) {
    if (text == null) return '';
    const withoutFootnotes = String(text)
        .replace(SUP_RE, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(TAG_RE, '');
    const decoded = withoutFootnotes.replace(ENTITY_RE, (full, body) => {
        if (body[0] === '#') {
            const code = body[1] === 'x' || body[1] === 'X'
                ? Number.parseInt(body.slice(2), 16)
                : Number.parseInt(body.slice(1), 10);
            if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return full;
            return String.fromCodePoint(code);
        }
        return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : full;
    });
    return decoded.replace(/\s+/g, ' ').trim();
}

/**
 * `{ arabic, translation }` for a verse object (both may be empty strings),
 * or null when `verse` isn't an object.
 */
export function extractVerseText(verse) {
    if (!verse || typeof verse !== 'object') return null;
    const arabic = getVerseArabicText(verse);
    const first = Array.isArray(verse.translations) ? verse.translations[0] : null;
    return {
        arabic: arabic ? String(arabic).trim() : '',
        translation: stripTranslationHtml(first?.text),
    };
}
