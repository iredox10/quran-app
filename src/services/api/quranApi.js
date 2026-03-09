import axios from 'axios';
import { getMushafById } from '../../config/mushaf';

const api = axios.create({
  baseURL: 'https://api.quran.com/api/v4',
  headers: {
    Accept: 'application/json',
  },
});

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
  const { data } = await api.get('/chapters', {
    params: { language: 'en' }
  });
  return data.chapters;
};

export const getChapter = async (id) => {
  const { data } = await api.get(`/chapters/${id}`, {
    params: { language: 'en' }
  });
  return data.chapter;
};

export const getVerses = async (chapterId, translationId = 85, reciterId = 7, page = 1, mushafId = 'madani-standard', perPage = 50) => {
  const { mushaf, fields, wordFields } = buildFieldsForMushaf(mushafId);
  const { data } = await api.get(`/verses/by_chapter/${chapterId}`, {
    params: {
      language: 'en',
      words: true,
      translations: translationId,
      audio: reciterId,
      fields,
      word_fields: wordFields,
      mushaf: mushaf.apiMushafId,
      page: page,
      per_page: perPage,
    },
  });
  return {
    ...data,
    verses: decorateVerses(data.verses, mushaf),
  };
};

export const getVersesByPage = async (pageNumber, translationId = 85, reciterId = 7, mushafId = 'madani-standard') => {
  const { mushaf, fields, wordFields } = buildFieldsForMushaf(mushafId);
  const { data } = await api.get(`/verses/by_page/${pageNumber}`, {
    params: {
      language: 'en',
      words: true,
      translations: translationId,
      audio: reciterId,
      fields,
      word_fields: wordFields,
      mushaf: mushaf.apiMushafId,
      per_page: 50,
    },
  });
  return {
    ...data,
    verses: decorateVerses(data.verses, mushaf),
  };
};


export const getChapterAudio = async (chapterId, reciterId = 7) => {
  const { data } = await api.get(`/chapter_recitations/${reciterId}/${chapterId}`);
  return data.audio_file;
};

export const getChapterTafsirs = async (chapterId, tafsirId = 169) => {
  const { data } = await api.get(`/tafsirs/${tafsirId}/by_chapter/${chapterId}`);
  return data.tafsirs;
};

export const getTajweedVerses = async (chapterId) => {
  const { data } = await api.get(`/quran/verses/uthmani_tajweed`, {
    params: { chapter_number: chapterId }
  });
  return data.verses; // Array of { id, verse_key, text_uthmani_tajweed }
};

export const getTajweedVersesByPage = async (pageNumber) => {
  const { data } = await api.get(`/quran/verses/uthmani_tajweed`, {
    params: { page_number: pageNumber }
  });
  return data.verses;
};
