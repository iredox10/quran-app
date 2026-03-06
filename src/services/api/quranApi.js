import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.quran.com/api/v4',
  headers: {
    Accept: 'application/json',
  },
});

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

export const getVerses = async (chapterId, translationId = 85, reciterId = 7, page = 1) => {
  const { data } = await api.get(`/verses/by_chapter/${chapterId}`, {
    params: {
      language: 'en',
      words: true,
      translations: translationId,
      audio: reciterId,
      fields: 'text_uthmani,page_number',
      page: page,
      per_page: 50,
    },
  });
  return data;
};

export const getVersesByPage = async (pageNumber, translationId = 85, reciterId = 7) => {
  const { data } = await api.get(`/verses/by_page/${pageNumber}`, {
    params: {
      language: 'en',
      words: true,
      translations: translationId,
      audio: reciterId,
      fields: 'text_uthmani,page_number',
      per_page: 50,
    },
  });
  return data;
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
