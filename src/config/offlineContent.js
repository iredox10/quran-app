export const QURAN_TOTAL_CHAPTERS = 114;
export const QURAN_TOTAL_PAGES = 604;
export const QURAN_TEXT_CHAPTER_BATCHES = 190;

export const QURAN_TEXT_CACHE_PREFIXES = [
  '/chapters?language=en',
  '/chapters/',
  '/verses/by_chapter/',
  '/verses/by_page/',
  '/chapter_recitations/',
];

export const TAJWEED_CACHE_PREFIXES = [
  '/quran/verses/uthmani_tajweed',
];

export const OFFLINE_PACKS = {
  coreQuran: {
    id: 'coreQuran',
    title: 'Core Quran Pack',
    description: 'Everything required for offline reading: Quran text, page view data, surah metadata, recitation metadata, and tajweed markup.',
    tier: 'required',
    installMode: 'download-on-web-preinstalled-on-mobile',
    includes: ['Surah metadata', 'Page view data', 'Current Mushaf text', 'Tajweed markup', 'Recitation metadata'],
  },
  quranText: {
    id: 'quranText',
    title: 'Reading Data Layer',
    description: 'Chapters, page navigation, surah text, and recitation metadata for the current reading setup.',
    tier: 'required',
    installMode: 'download-on-web-preinstalled-on-mobile',
    includes: ['Chapters', 'Surah pages', 'Mushaf-aware text', 'Page reader cache'],
  },
  tajweed: {
    id: 'tajweed',
    title: 'Tajweed Layer',
    description: 'Full tajweed markup for both surah view and page view so color-coded recitation works offline.',
    tier: 'required',
    installMode: 'download-on-web-preinstalled-on-mobile',
    includes: ['Surah tajweed', 'Page tajweed'],
  },
};

export const OFFLINE_PACK_ORDER = ['coreQuran', 'quranText', 'tajweed'];

export const OFFLINE_EXPECTED_ENTRIES = {
  quranText: 1 + QURAN_TOTAL_CHAPTERS + QURAN_TEXT_CHAPTER_BATCHES + QURAN_TOTAL_PAGES + QURAN_TOTAL_CHAPTERS,
  tajweed: QURAN_TOTAL_CHAPTERS + QURAN_TOTAL_PAGES,
};

OFFLINE_EXPECTED_ENTRIES.coreQuran = OFFLINE_EXPECTED_ENTRIES.quranText + OFFLINE_EXPECTED_ENTRIES.tajweed;

export function getOfflinePackEntries() {
  return OFFLINE_PACK_ORDER.map((packId) => OFFLINE_PACKS[packId]);
}
