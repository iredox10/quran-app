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

export const getVerses = async (chapterId, translationId = 131, reciterId = 7, page = 1) => {
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

export const getChapterAudio = async (chapterId, reciterId = 7) => {
  const { data } = await api.get(`/chapter_recitations/${reciterId}/${chapterId}`);
  return data.audio_file;
};

export const getChapterTafsirs = async (chapterId, tafsirId = 169) => {
  const { data } = await api.get(`/tafsirs/${tafsirId}/by_chapter/${chapterId}`);
  return data.tafsirs;
};
