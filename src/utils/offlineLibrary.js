import { buildOfflineCacheKey, getChapters, getTajweedVerses, getTajweedVersesByPage, getVerses, getVersesByPage } from '../services/api/quranApi';
import { deleteOfflineCacheByPrefix, getOfflineCacheStats, getOfflineCacheData } from './offlineCache';

export const OFFLINE_PACKS = {
  quranText: {
    id: 'quranText',
    title: 'Quran Text Pack',
    description: 'Chapters, verses, page data, and Mushaf-aware Quran text for the current reading setup.',
  },
  tajweed: {
    id: 'tajweed',
    title: 'Tajweed Pack',
    description: 'Color-coded tajweed markup for every Surah in the Quran.',
  },
};

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export async function getOfflinePackStats({ translationId, reciterId, mushafId }) {
  const quranPrefixes = [
    buildOfflineCacheKey('/chapters', { language: 'en' }).split('?')[0],
    '/chapters/',
    '/verses/by_chapter/',
    '/verses/by_page/',
    '/chapter_recitations/',
  ];
  const tajweedPrefix = '/quran/verses/uthmani_tajweed';

  const [quranStats, tajweedStats, quranCompleteFlag, tajweedCompleteFlag] = await Promise.all([
    getOfflineCacheStats(),
    getOfflineCacheStats(tajweedPrefix),
    getOfflineCacheData('PACK_SYNC_QURAN_TEXT'),
    getOfflineCacheData('PACK_SYNC_TAJWEED'),
  ]);

  const quranEntryCount = quranStats.count - tajweedStats.count;
  const quranBytes = Math.max(quranStats.approximateBytes - tajweedStats.approximateBytes, 0);

  return {
    quranText: {
      downloaded: !!quranCompleteFlag,
      entryCount: quranEntryCount,
      sizeLabel: formatBytes(quranBytes),
      translationId,
      reciterId,
      mushafId,
      prefixes: quranPrefixes,
    },
    tajweed: {
      downloaded: !!tajweedCompleteFlag,
      entryCount: tajweedStats.count,
      sizeLabel: formatBytes(tajweedStats.approximateBytes),
      prefixes: [tajweedPrefix],
    },
  };
}

export async function syncQuranTextPack({ translationId, reciterId, mushafId, onProgress }) {
  const chapters = await getChapters();
  const totalUnits = chapters.reduce((sum, chapter) => sum + Math.ceil(chapter.verses_count / 50), 0) + 604;
  let completedUnits = 0;

  onProgress?.({ current: completedUnits, total: totalUnits, label: 'Preparing chapters' });

  for (const chapter of chapters) {
    const totalPages = Math.ceil(chapter.verses_count / 50);
    for (let page = 1; page <= totalPages; page += 1) {
      await getVerses(chapter.id, translationId, reciterId, page, mushafId);
      completedUnits += 1;
      onProgress?.({ current: completedUnits, total: totalUnits, label: `Caching ${chapter.name_simple} · part ${page}` });
    }
  }

  for (let page = 1; page <= 604; page += 1) {
    await getVersesByPage(page, translationId, reciterId, mushafId);
    completedUnits += 1;
    onProgress?.({ current: completedUnits, total: totalUnits, label: `Caching Mushaf Page ${page}` });
  }

  const { setOfflineCacheEntry } = await import('./offlineCache');
  await setOfflineCacheEntry('PACK_SYNC_QURAN_TEXT', { completedAt: Date.now() });
}

export async function syncTajweedPack({ onProgress }) {
  const chapters = await getChapters();
  const totalUnits = chapters.length + 604;
  let completedUnits = 0;

  for (let index = 0; index < chapters.length; index += 1) {
    const chapter = chapters[index];
    await getTajweedVerses(chapter.id);
    completedUnits += 1;
    onProgress?.({ current: completedUnits, total: totalUnits, label: `Caching Tajweed ${chapter.name_simple}` });
  }

  for (let page = 1; page <= 604; page += 1) {
    await getTajweedVersesByPage(page);
    completedUnits += 1;
    onProgress?.({ current: completedUnits, total: totalUnits, label: `Caching Tajweed Page ${page}` });
  }

  const { setOfflineCacheEntry } = await import('./offlineCache');
  await setOfflineCacheEntry('PACK_SYNC_TAJWEED', { completedAt: Date.now() });
}

export async function deleteOfflinePack(packId) {
  if (packId === 'tajweed') {
    await deleteOfflineCacheByPrefix('/quran/verses/uthmani_tajweed');
    const { deleteOfflineCacheByPrefix: deleteExact } = await import('./offlineCache');
    await deleteExact('PACK_SYNC_TAJWEED');
    return;
  }

  const prefixes = ['/chapters', '/chapters/', '/verses/by_chapter/', '/verses/by_page/', '/chapter_recitations/'];
  await Promise.all(prefixes.map((prefix) => deleteOfflineCacheByPrefix(prefix)));
  
  const { deleteOfflineCacheByPrefix: deleteExact } = await import('./offlineCache');
  await deleteExact('PACK_SYNC_QURAN_TEXT');
}
