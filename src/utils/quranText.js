// U+25CC DOTTED CIRCLE is a shaper placeholder that can leak into scraped
// text and is never part of authoritative Uthmani/IndoPak Quran data, so it
// is always removed.
//
// Every actual Quranic sign is kept: the Quranic annotation range
// (U+06D6-06ED — saktah, imalah, ishmam, sajda, small high/low rounded
// zeros, small waw/ya, noon, the U+06DD end-of-ayah frame), the extended
// Arabic marks (U+0610-061A used by IndoPak text), the harakat, and the
// ornate parentheses (U+FD3E/U+FD3F). All offered Arabic fonts carry those
// glyphs (cmap-audited: KFGQPC Hafs Ver18, Uthman Taha Naskh Ver10, Amiri
// Quran, Scheherazade New, Noto Naskh Arabic), and the limited Uthman Taha
// Naskh stack still falls through to Amiri Quran for its missing marks, so
// stripping signs only deleted real Quranic marks from every verse.
const PLACEHOLDER_CHARS = /[\u25cc]/g;

export function cleanArabicText(text) {
  if (!text) return text;
  return text.replace(PLACEHOLDER_CHARS, '');
}

export function getWordArabicText(word, mushaf) {
  if (!word) {
    return '';
  }

  const field = mushaf?.scriptField;
  const rawText = word[field] || word.text_uthmani || word.text_indopak || word.text_qpc_hafs || word.text || '';
  return cleanArabicText(rawText);
}

const TAJWEED_HTML_REPLACEMENTS = [
  [/\u0672/g, '\u0670'],
  [PLACEHOLDER_CHARS, ''],
];

export function sanitizeTajweedHtml(html) {
  if (!html) {
    return '';
  }

  let cleaned = TAJWEED_HTML_REPLACEMENTS.reduce((output, [pattern, replacement]) => {
    return output.replace(pattern, replacement);
  }, html);

  cleaned = cleaned.replace(/<rule /g, '<tajweed ');
  cleaned = cleaned.replace(/<\/rule>/g, '</tajweed>');

  return cleaned;
}

export function getVerseArabicText(verse, mushaf) {
  if (!verse) {
    return '';
  }

  if (verse.arabic_text) {
    return cleanArabicText(verse.arabic_text);
  }

  const verseField = mushaf?.verseField;
  if (verseField && verse[verseField]) {
    return cleanArabicText(verse[verseField]);
  }

  if (Array.isArray(verse.words) && verse.words.length > 0) {
    return verse.words
      .map((word) => getWordArabicText(word, mushaf))
      .filter(Boolean)
      .join(' ');
  }

  const fallbackText = verse.text_uthmani || verse.text_indopak || verse.text_qpc_hafs || '';
  return cleanArabicText(fallbackText);
}
