import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.quran.com/api/v4';
const OUTPUT_DIR = path.join(__dirname, '../public/quran-data');
const MUSHAF_MAP = {
  'madani-standard': { apiMushafId: 5, verseField: 'text_qpc_hafs', wordField: 'text_qpc_hafs' },
  'madani-tajweed': { apiMushafId: 19, verseField: 'text_qpc_hafs', wordField: 'text_qpc_hafs' },
  'indopak': { apiMushafId: 3, verseField: 'text_indopak', wordField: 'text_indopak' },
};
const TRANSLATION_ID = 85;
const RECITER_ID = 7;
const PER_PAGE = 50;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`  Retry ${i + 1}/${retries} for ${url}`);
      await delay(2000 * (i + 1));
    }
  }
}

async function fetchWithPagination(url) {
  let page = 1;
  let allResults = [];
  while (true) {
    const separator = url.includes('?') ? '&' : '?';
    const data = await fetchJson(`${url}${separator}page=${page}&per_page=${PER_PAGE}`);
    const key = Object.keys(data).find(k => Array.isArray(data[k]));
    const items = data[key] || [];
    allResults = allResults.concat(items);
    console.log(`  Fetched page ${page}, got ${items.length} items (total: ${allResults.length})`);
    if (data.pagination && page >= data.pagination.total_pages) break;
    if (items.length < PER_PAGE) break;
    page++;
    await delay(300);
  }
  return allResults;
}

async function main() {
  console.log('=== Quran Data Export Script ===\n');

  // Allow skipping export (useful for local dev when data already exists)
  if (process.env.SKIP_QURAN_EXPORT === '1' || process.env.SKIP_QURAN_EXPORT === 'true') {
    console.log('SKIP_QURAN_EXPORT is set. Skipping data export.');
    if (!fs.existsSync(OUTPUT_DIR)) {
      console.log('No existing data found. Running generate:data to create placeholders...');
      return;
    }
    console.log('Existing data found at:', OUTPUT_DIR);
    return;
  }

  // Check if data already exists and is recent (within 30 days)
  const forceFlag = process.argv.includes('--force');
  const markerFile = path.join(OUTPUT_DIR, '.export-timestamp');
  if (!forceFlag && fs.existsSync(markerFile)) {
    const timestamp = parseInt(fs.readFileSync(markerFile, 'utf-8'), 10);
    const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    if (ageDays < 30) {
      console.log(`Data is ${Math.round(ageDays)} days old (fresh enough). Skipping export.`);
      console.log('Use --force to re-download: node scripts/export-quran-json.js --force');
      return;
    }
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Fetch chapters (surahs) metadata
  console.log('[1/5] Fetching chapters metadata...');
  const chaptersData = await fetchJson(`${API_BASE}/chapters?language=en`);
  const chapters = chaptersData.chapters;
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'chapters.json'),
    JSON.stringify(chapters, null, 2)
  );
  console.log(`  Saved ${chapters.length} chapters\n`);

  // 2. Fetch tajweed verses for all surahs
  console.log('[2/5] Fetching tajweed verses...');
  const allTajweed = {};
  for (const chapter of chapters) {
    const data = await fetchJson(`${API_BASE}/quran/verses/uthmani_tajweed?chapter_number=${chapter.id}`);
    allTajweed[chapter.id] = data.verses;
    console.log(`  Surah ${chapter.id} (${chapter.name_simple}): ${data.verses.length} verses`);
    await delay(200);
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'tajweed.json'),
    JSON.stringify(allTajweed, null, 2)
  );
  console.log(`  Saved tajweed for ${Object.keys(allTajweed).length} surahs\n`);

  // 3. Fetch verses for each mushaf (by chapter, paginated)
  for (const [mushafId, mushafConfig] of Object.entries(MUSHAF_MAP)) {
    const mushafDir = path.join(OUTPUT_DIR, 'verses', mushafId);
    if (!fs.existsSync(mushafDir)) {
      fs.mkdirSync(mushafDir, { recursive: true });
    }

    console.log(`[3/5] Fetching verses for mushaf: ${mushafId}...`);

    // Fetch chapter info for verse counts
    for (const chapter of chapters) {
      const totalPages = Math.ceil(chapter.verses_count / PER_PAGE);
      const chapterVerses = [];

      for (let page = 1; page <= totalPages; page++) {
        const params = new URLSearchParams({
          language: 'en',
          words: 'true',
          translations: TRANSLATION_ID,
          audio: RECITER_ID,
          fields: `${mushafConfig.verseField},page_number`,
          word_fields: `${mushafConfig.wordField},page_number,line_number`,
          mushaf: mushafConfig.apiMushafId,
          page: page,
          per_page: PER_PAGE,
        });

        const data = await fetchJson(`${API_BASE}/verses/by_chapter/${chapter.id}?${params}`);
        chapterVerses.push(...(data.verses || []));
        console.log(`  Surah ${chapter.id} page ${page}/${totalPages}`);
        await delay(300);
      }

      // Decorate verses with arabic_text field (matching quranApi.js logic)
      const decorated = chapterVerses.map(v => ({
        ...v,
        arabic_text: v[mushafConfig.verseField] || v.text_uthmani || v.text_indopak || v.text_qpc_hafs || '',
      }));

      fs.writeFileSync(
        path.join(mushafDir, `${chapter.id}.json`),
        JSON.stringify({
          chapterId: chapter.id,
          mushaf: mushafId,
          pagination: { current_page: 1, total_pages: totalPages, total_verses: decorated.length },
          verses: decorated,
        }, null, 2)
      );
      console.log(`  Saved Surah ${chapter.id}: ${decorated.length} verses\n`);
    }
  }

  // 4. Fetch verses by page (for page view) — using madani-standard as default
  console.log('[4/5] Fetching verses by page (madani-standard)...');
  const pageDir = path.join(OUTPUT_DIR, 'verses-by-page', 'madani-standard');
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }

  const mushafConfig = MUSHAF_MAP['madani-standard'];
  for (let pageNum = 1; pageNum <= 604; pageNum++) {
    const params = new URLSearchParams({
      language: 'en',
      words: 'true',
      translations: TRANSLATION_ID,
      audio: RECITER_ID,
      fields: `${mushafConfig.verseField},page_number`,
      word_fields: `${mushafConfig.wordField},page_number,line_number`,
      mushaf: mushafConfig.apiMushafId,
      per_page: PER_PAGE,
    });

    const data = await fetchJson(`${API_BASE}/verses/by_page/${pageNum}?${params}`);
    const decorated = (data.verses || []).map(v => ({
      ...v,
      arabic_text: v[mushafConfig.verseField] || v.text_uthmani || v.text_indopak || v.text_qpc_hafs || '',
    }));

    fs.writeFileSync(
      path.join(pageDir, `${pageNum}.json`),
      JSON.stringify({
        pageNumber: pageNum,
        mushaf: 'madani-standard',
        verses: decorated,
      }, null, 2)
    );

    if (pageNum % 50 === 0 || pageNum === 604) {
      console.log(`  Fetched page ${pageNum}/604`);
    }
    await delay(200);
  }
  console.log('  Saved all 604 pages\n');

  // 5. Fetch tajweed by page
  console.log('[5/5] Fetching tajweed by page...');
  const tajweedByPage = {};
  for (let pageNum = 1; pageNum <= 604; pageNum++) {
    const data = await fetchJson(`${API_BASE}/quran/verses/uthmani_tajweed?page_number=${pageNum}`);
    tajweedByPage[pageNum] = data.verses;
    if (pageNum % 100 === 0 || pageNum === 604) {
      console.log(`  Fetched tajweed page ${pageNum}/604`);
    }
    await delay(200);
  }
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'tajweed-by-page.json'),
    JSON.stringify(tajweedByPage, null, 2)
  );
  console.log('  Saved tajweed by page\n');

  // Summary
  const totalSize = getDirSize(OUTPUT_DIR);
  console.log('=== Export Complete ===');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  // Write timestamp marker so future builds can skip if data is fresh
  fs.writeFileSync(markerFile, Date.now().toString());
}

function getDirSize(dir) {
  let size = 0;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += stat.size;
    }
  }
  return size;
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
