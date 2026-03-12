export function getWordArabicText(word, mushaf) {
  if (!word) {
    return '';
  }

  const field = mushaf?.scriptField;
  return word[field] || word.text_uthmani || word.text_indopak || word.text_qpc_hafs || word.text || '';
}

const TAJWEED_HTML_REPLACEMENTS = [
  [/\u0672/g, '\u0670'],
  [/\u06df/g, ''],
];

export function sanitizeTajweedHtml(html) {
  if (!html) {
    return '';
  }

  return TAJWEED_HTML_REPLACEMENTS.reduce((output, [pattern, replacement]) => {
    return output.replace(pattern, replacement);
  }, html);
}

export function getVerseArabicText(verse, mushaf) {
  if (!verse) {
    return '';
  }

  if (verse.arabic_text) {
    return verse.arabic_text;
  }

  const verseField = mushaf?.verseField;
  if (verseField && verse[verseField]) {
    return verse[verseField];
  }

  if (Array.isArray(verse.words) && verse.words.length > 0) {
    return verse.words
      .map((word) => getWordArabicText(word, mushaf))
      .filter(Boolean)
      .join(' ');
  }

  return verse.text_uthmani || verse.text_indopak || verse.text_qpc_hafs || '';
}
