import axios from 'axios';
import { buildReciterUrl } from '../../utils/audioUrl';
import { getMushafById } from '../../config/mushaf';
import { getOfflineCacheData, setOfflineCacheEntry } from '../../utils/offlineCache';
import { renderApiBaseUrl } from '../apiConfig';

const api = axios.create({ baseURL: renderApiBaseUrl, timeout: 25000, headers: { Accept: 'application/json' } });
const PATH_MAP = [
  [/^\/chapters$/, () => '/v1/chapters'],
  [/^\/verses\/by_chapter\/([^/]+)$/, m => `/v1/verses/${m[1]}`],
  [/^\/verses\/by_page\/([^/]+)$/, m => `/v1/pages/${m[1]}`],
  [/^\/tafsirs\/([^/]+)\/by_chapter\/([^/]+)$/, m => `/v1/tafsir/${m[1]}/by_chapter/${m[2]}`],
  [/^\/tafsirs\/([^/]+)\/by_page\/([^/]+)$/, m => `/v1/tafsir/${m[1]}/by_page/${m[2]}`],
  [/^\/foot_notes\/([^/]+)$/, m => `/v1/footnotes/${m[1]}`],
  [/^\/chapter_recitations\/([^/]+)\/([^/]+)$/, m => `/v1/chapter-audio/${m[1]}/${m[2]}`],
  [/^\/juzs$/, () => '/v1/juzs'],
];
export const mapRenderContentPath = path => {
  for (const [pattern, build] of PATH_MAP) { const match = path.match(pattern); if (match) return build(match); }
  throw new Error(`Unsupported content endpoint: ${path}`);
};
export const backendContentParams = (params = {}) => ({
  ...(params.translations != null ? { translation: params.translations } : {}),
  ...(params.mushaf != null ? { mushaf: params.mushaf } : {}),
  ...(params.page != null ? { page: params.page } : {}),
  ...(params.per_page != null ? { per_page: params.per_page } : {}),
  ...(params.words != null ? { words: params.words ? 1 : 0 } : {}),
  tajweed: 1,
});

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
    const { data } = await api.get(mapRenderContentPath(path), { params: backendContentParams(params) });
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
  text_uthmani: ['text_uthmani', 'page_number', 'line_number', 'translation', 'text_uthmani_tajweed'],
  text_indopak: ['text_indopak', 'text_uthmani', 'page_number', 'line_number', 'translation', 'text_uthmani_tajweed'],
  text_qpc_hafs: ['text_qpc_hafs', 'text_uthmani', 'page_number', 'line_number', 'translation', 'text_uthmani_tajweed'],
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
  const data = await fetchWithOfflineCache('/chapters', { language: 'en' });
  return data.chapters;
};

export const getChapter = async id => {
  const chapters = await getChapters();
  const chapter = chapters.find(row => String(row.id) === String(id));
  if (!chapter) throw new Error(`Chapter ${id} not found`);
  return chapter;
};

export const getVerses = async (chapterId, translationId = 85, reciterId = 7, page = 1, mushafId = 'madani-standard', perPage = 50) => {
  const { mushaf, fields, wordFields } = buildFieldsForMushaf(mushafId);
  const isEveryAyah = typeof reciterId === 'string';
  const params = {
    language: 'en',
    words: true,
    translations: translationId,
    audio: isEveryAyah ? 7 : reciterId,
    fields,
    word_fields: wordFields,
    mushaf: mushaf.apiMushafId,
    page,
    per_page: perPage,
  };
  const data = await fetchWithOfflineCache(`/verses/by_chapter/${chapterId}`, params);
  
  {
      data.verses.forEach(v => {
          v.audio = { url: buildReciterUrl(reciterId, v.verse_key) };
      });
  }

  return {
    ...data,
    verses: decorateVerses(data.verses, mushaf),
  };
};

export const getVersesByPage = async (pageNumber, translationId = 85, reciterId = 7, mushafId = 'madani-standard') => {
  const { mushaf, fields, wordFields } = buildFieldsForMushaf(mushafId);
  const isEveryAyah = typeof reciterId === 'string';
  const params = {
    language: 'en',
    words: true,
    translations: translationId,
    audio: isEveryAyah ? 7 : reciterId,
    fields,
    word_fields: wordFields,
    mushaf: mushaf.apiMushafId,
    per_page: 50,
  };
  const data = await fetchWithOfflineCache(`/verses/by_page/${pageNumber}`, params);
  
  {
      data.verses.forEach(v => {
          v.audio = { url: buildReciterUrl(reciterId, v.verse_key) };
      });
  }

  return {
    ...data,
    verses: decorateVerses(data.verses, mushaf),
  };
};


export const getChapterAudio = async (chapterId, reciterId = 7) => {
  if (typeof reciterId === 'string') return null;
  const data = await fetchWithOfflineCache(`/chapter_recitations/${reciterId}/${chapterId}`);
  return data.audio_file;
};

export const getChapterTafsirs = async (chapterId, tafsirId = 169) => {
  const data = await fetchWithOfflineCache(`/tafsirs/${tafsirId}/by_chapter/${chapterId}`);
  return data.tafsirs;
};

export const getPageTafsirs = async (pageNumber, tafsirId = 169) => {
  const data = await fetchWithOfflineCache(`/tafsirs/${tafsirId}/by_page/${pageNumber}`);
  return data.tafsirs;
};

export const getTajweedVerses = async chapterId => {
  const result = await getVerses(chapterId, 20, 7, 1, 'madani-standard', 300);
  return result.verses;
};
export const getTajweedVersesByPage = async page => {
  const result = await getVersesByPage(page, 20, 7);
  return result.verses;
};

export const getJuzs = async () => {
  const data = await fetchWithOfflineCache('/juzs');
  return data.juzs;
};

export const getFootnote = async (footnoteId) => {
  const data = await fetchWithOfflineCache(`/foot_notes/${footnoteId}`);
  return data.foot_note;
};
