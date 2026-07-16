// Characters that often cause rendering issues (dotted circles) in web fonts:
// \u06ea: Arabic Empty Centre Low Stop (Imalah)
// \u06eb: Arabic Empty Centre High Stop (Ishmam)
// \u06ec: Arabic Rounded High Stop With Filled Centre
const PROBLEM_CHARS = /[\u06ea\u06eb\u06ec]/g;

export function cleanArabicText(text) {
  if (!text) return text;
  return text.replace(PROBLEM_CHARS, '');
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
  [/\u06df/g, ''],
  [PROBLEM_CHARS, ''],
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
