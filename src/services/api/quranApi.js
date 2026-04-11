import axios from 'axios';
import { getMushafById } from '../../config/mushaf';
import { getOfflineCacheData, setOfflineCacheEntry } from '../../utils/offlineCache';

const api = axios.create({
  baseURL: 'https://api.quran.com/api/v4',
  headers: {
    Accept: 'application/json',
  },
});

const STATIC_BASE = '/quran-data';

async function loadStaticJson(path) {
  try {
    const res = await fetch(`${STATIC_BASE}${path}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function hasStaticVerses(data) {
  return data && data.verses && data.verses.length > 0 && !data._note;
}

const buildCacheKey = (path, params = {}) => {
  const normalizedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  return `${path}?${new URLSearchParams(normalizedParams).toString()}`;
};

export const buildOfflineCacheKey = buildCacheKey;

const fetchWithOfflineCache = async (path, params = {}) => {
  const cacheKey = buildCacheKey(path, params);

  try {
    const { data } = await api.get(path, { params });
    await setOfflineCacheEntry(cacheKey, data);
    return data;
  } catch (error) {
    const offlineData = await getOfflineCacheData(cacheKey);
    if (offlineData) {
      return offlineData;
    }
    throw error;
  }
};

const WORD_FIELD_BY_MUSHAF = {
  text_uthmani: ['text_uthmani', 'page_number', 'line_number'],
  text_indopak: ['text_indopak', 'text_uthmani', 'page_number', 'line_number'],
  text_qpc_hafs: ['text_qpc_hafs', 'text_uthmani', 'page_number', 'line_number'],
};

const VERSE_FIELD_BY_MUSHAF = {
  text_uthmani: ['text_uthmani', 'page_number'],
  text_indopak: ['text_indopak', 'text_uthmani', 'page_number'],
  text_qpc_hafs: ['text_qpc_hafs', 'text_uthmani', 'page_number'],
};

const buildFieldsForMushaf = (mushafId) => {
  const mushaf = getMushafById(mushafId);
  const verseFields = VERSE_FIELD_BY_MUSHAF[mushaf.verseField] || VERSE_FIELD_BY_MUSHAF.text_uthmani;
  const wordFields = WORD_FIELD_BY_MUSHAF[mushaf.scriptField] || WORD_FIELD_BY_MUSHAF.text_uthmani;

  return {
    mushaf,
    fields: verseFields.join(','),
    wordFields: wordFields.join(','),
  };
};

const decorateVerses = (verses = [], mushaf) => verses.map((verse) => ({
  ...verse,
  arabic_text: verse[mushaf.verseField] || verse.text_uthmani || verse.text_indopak || verse.text_qpc_hafs || '',
}));

export const getChapters = async () => {
  const staticData = await loadStaticJson('/chapters.json');
  if (staticData) return staticData;

  const data = await fetchWithOfflineCache('/chapters', { language: 'en' });
  return data.chapters;
};

export const getChapter = async (id) => {
  const staticData = await loadStaticJson('/chapters.json');
  if (staticData) {
    const chapter = staticData.find(c => c.id === Number(id));
    if (chapter) return chapter;
  }

  const data = await fetchWithOfflineCache(`/chapters/${id}`, { language: 'en' });
  return data.chapter;
};

export const getVerses = async (chapterId, translationId = 85, reciterId = 7, page = 1, mushafId = 'madani-standard', perPage = 50) => {
  const { mushaf } = buildFieldsForMushaf(mushafId);

  // Try static JSON first
  const staticData = await loadStaticJson(`/verses/${mushafId}/${chapterId}.json`);
  if (hasStaticVerses(staticData)) {
    const startIdx = (page - 1) * perPage;
    const endIdx = startIdx + perPage;
    const pagedVerses = staticData.verses.slice(startIdx, endIdx);

    // Merge bundled translation if available
    const translationData = await loadStaticJson(`/translations/${translationId}/${chapterId}.json`);
    const mergedVerses = pagedVerses.map(v => {
      if (translationData?.translations) {
        const translation = translationData.translations.find(t => t.verse_key === v.verse_key);
        if (translation) {
          return { ...v, translations: [{ text: translation.text, resource_name: translation.resource_name || '' }] };
        }
      }
      return v;
    });

    return {
      verses: decorateVerses(mergedVerses, mushaf),
      pagination: {
        current_page: page,
        total_pages: Math.ceil(staticData.verses.length / perPage),
        total_records: staticData.verses.length,
      },
    };
  }

  // Fallback to API
  const params = {
    language: 'en',
    words: true,
    translations: translationId,
    audio: reciterId,
    fields: buildFieldsForMushaf(mushafId).fields,
    word_fields: buildFieldsForMushaf(mushafId).wordFields,
    mushaf: mushaf.apiMushafId,
    page,
    per_page: perPage,
  };
  const data = await fetchWithOfflineCache(`/verses/by_chapter/${chapterId}`, params);
  return {
    ...data,
    verses: decorateVerses(data.verses, mushaf),
  };
};

export const getVersesByPage = async (pageNumber, translationId = 85, reciterId = 7, mushafId = 'madani-standard') => {
  const { mushaf } = buildFieldsForMushaf(mushafId);

  // Try static JSON first
  const staticData = await loadStaticJson(`/verses-by-page/${mushafId}/${pageNumber}.json`);
  if (hasStaticVerses(staticData)) {
    // Merge bundled translations
    const chapterIds = [...new Set(staticData.verses.map(v => v.chapter_id || v.verse_key?.split(':')[0]))];
    let mergedVerses = staticData.verses;

    for (const chapterId of chapterIds) {
      const translationData = await loadStaticJson(`/translations/${translationId}/${chapterId}.json`);
      if (translationData?.translations) {
        mergedVerses = mergedVerses.map(v => {
          const translation = translationData.translations.find(t => t.verse_key === v.verse_key);
          if (translation) {
            return { ...v, translations: [{ text: translation.text, resource_name: translation.resource_name || '' }] };
          }
          return v;
        });
      }
    }

    return {
      verses: decorateVerses(mergedVerses, mushaf),
    };
  }

  // Fallback to API
  const params = {
    language: 'en',
    words: true,
    translations: translationId,
    audio: reciterId,
    fields: buildFieldsForMushaf(mushafId).fields,
    word_fields: buildFieldsForMushaf(mushafId).wordFields,
    mushaf: mushaf.apiMushafId,
    per_page: 50,
  };
  const data = await fetchWithOfflineCache(`/verses/by_page/${pageNumber}`, params);
  return {
    ...data,
    verses: decorateVerses(data.verses, mushaf),
  };
};

export const getChapterAudio = async (chapterId, reciterId = 7) => {
  const data = await fetchWithOfflineCache(`/chapter_recitations/${reciterId}/${chapterId}`);
  return data.audio_file;
};

export const getChapterTafsirs = async (chapterId, tafsirId = 169) => {
  // Try static JSON first
  const staticData = await loadStaticJson(`/tafsir/${tafsirId}/${chapterId}.json`);
  if (staticData && staticData.tafsirs && staticData.tafsirs.length > 0) {
    return staticData.tafsirs;
  }

  const data = await fetchWithOfflineCache(`/tafsirs/${tafsirId}/by_chapter/${chapterId}`);
  return data.tafsirs;
};

export const getTajweedVerses = async (chapterId) => {
  // Try static JSON first
  const staticData = await loadStaticJson('/tajweed.json');
  if (staticData && staticData[chapterId]) {
    return staticData[chapterId];
  }

  const data = await fetchWithOfflineCache('/quran/verses/uthmani_tajweed', { chapter_number: chapterId });
  return data.verses;
};

export const getTajweedVersesByPage = async (pageNumber) => {
  // Try static JSON first
  const staticData = await loadStaticJson('/tajweed-by-page.json');
  if (staticData && staticData[pageNumber]) {
    return staticData[pageNumber];
  }

  const data = await fetchWithOfflineCache('/quran/verses/uthmani_tajweed', { page_number: pageNumber });
  return data.verses;
};
