import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../public/quran-data');

const API_BASE = 'https://api.quran.com/api/v4';
const QURAN_API = 'https://api.quran.com/api/v4/quran';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      const waitMs = 3000 * (i + 1);
      console.log(`  Retry ${i + 1}/${retries} in ${waitMs}ms...`);
      await delay(waitMs);
    }
  }
}

async function main() {
  console.log('=== Quran Data Export Script ===\n');

  if (process.env.SKIP_QURAN_EXPORT === '1' || process.env.SKIP_QURAN_EXPORT === 'true') {
    console.log('SKIP_QURAN_EXPORT is set. Skipping.');
    return;
  }

  const forceFlag = process.argv.includes('--force');
  const markerFile = path.join(OUTPUT_DIR, '.export-timestamp');
  if (!forceFlag && fs.existsSync(markerFile)) {
    const ageDays = (Date.now() - parseInt(fs.readFileSync(markerFile, 'utf-8'), 10)) / (1000 * 60 * 60 * 24);
    if (ageDays < 30) {
      console.log(`Data is ${Math.round(ageDays)} days old. Skipping. Use --force to re-download.`);
      return;
    }
  }

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Chapters
  console.log('[1/6] Fetching chapters...');
  const chapters = (await fetchJson(`${API_BASE}/chapters?language=en`)).chapters;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'chapters.json'), JSON.stringify(chapters, null, 2));
  console.log(`  Saved ${chapters.length} chapters\n`);

  // 2. Tajweed (all surahs, one call each)
  console.log('[2/6] Fetching tajweed...');
  const tajweedFile = path.join(OUTPUT_DIR, 'tajweed.json');
  let allTajweed = {};
  if (fs.existsSync(tajweedFile)) {
    allTajweed = JSON.parse(fs.readFileSync(tajweedFile, 'utf-8'));
    console.log(`  Loaded existing tajweed for ${Object.keys(allTajweed).length} surahs`);
  }
  for (const ch of chapters) {
    if (allTajweed[ch.id]) continue;
    const data = await fetchJson(`${QURAN_API}/verses/uthmani_tajweed?chapter_number=${ch.id}`);
    allTajweed[ch.id] = data.verses;
    if (ch.id % 20 === 0 || ch.id === 114) console.log(`  Surah ${ch.id}/114`);
    await delay(100);
  }
  fs.writeFileSync(tajweedFile, JSON.stringify(allTajweed, null, 2));
  console.log('  Done\n');

  // 3. Tajweed by page
  console.log('[3/6] Fetching tajweed by page...');
  const tajweedPageFile = path.join(OUTPUT_DIR, 'tajweed-by-page.json');
  let tajweedByPage = {};
  if (fs.existsSync(tajweedPageFile)) {
    tajweedByPage = JSON.parse(fs.readFileSync(tajweedPageFile, 'utf-8'));
    console.log(`  Loaded existing tajweed-by-page for ${Object.keys(tajweedByPage).length} pages`);
  }
  for (let p = 1; p <= 604; p++) {
    if (tajweedByPage[p]) continue;
    const data = await fetchJson(`${QURAN_API}/verses/uthmani_tajweed?page_number=${p}`);
    tajweedByPage[p] = data.verses;
    if (p % 100 === 0 || p === 604) console.log(`  Page ${p}/604`);
    await delay(100);
  }
  fs.writeFileSync(tajweedPageFile, JSON.stringify(tajweedByPage, null, 2));
  console.log('  Done\n');

  // 4. Verses by chapter (madani-standard) — bulk endpoint, no pagination
  console.log('[4/6] Fetching verses by chapter (madani-standard)...');
  const verseDir = path.join(OUTPUT_DIR, 'verses', 'madani-standard');
  if (!fs.existsSync(verseDir)) fs.mkdirSync(verseDir, { recursive: true });

  for (const ch of chapters) {
    const outFile = path.join(verseDir, `${ch.id}.json`);
    if (fs.existsSync(outFile)) {
      if (ch.id % 20 === 0 || ch.id === 114) console.log(`  Surah ${ch.id}/114 (skipped, exists)`);
      continue;
    }
    const data = await fetchJson(
      `${API_BASE}/verses/by_chapter/${ch.id}?language=en&words=true&translations=85&audio=7&fields=text_qpc_hafs,page_number&word_fields=text_qpc_hafs,page_number,line_number&mushaf=5&per_page=${ch.verses_count}`
    );
    const decorated = (data.verses || []).map(v => ({
      ...v,
      arabic_text: v.text_qpc_hafs || v.text_uthmani || '',
    }));
    fs.writeFileSync(
      outFile,
      JSON.stringify({
        chapterId: ch.id,
        mushaf: 'madani-standard',
        pagination: { current_page: 1, total_pages: 1, total_verses: decorated.length },
        verses: decorated,
      }, null, 2)
    );
    if (ch.id % 20 === 0 || ch.id === 114) console.log(`  Surah ${ch.id}/114`);
    await delay(250);
  }
  console.log('  Done\n');

  // 5. Verses by page (madani-standard)
  console.log('[5/6] Fetching verses by page...');
  const pageDir = path.join(OUTPUT_DIR, 'verses-by-page', 'madani-standard');
  if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });

  for (let p = 1; p <= 604; p++) {
    const outFile = path.join(pageDir, `${p}.json`);
    if (fs.existsSync(outFile)) {
      if (p % 100 === 0 || p === 604) console.log(`  Page ${p}/604 (skipped)`);
      continue;
    }
    const data = await fetchJson(
      `${API_BASE}/verses/by_page/${p}?language=en&words=true&translations=85&audio=7&fields=text_qpc_hafs,page_number&word_fields=text_qpc_hafs,page_number,line_number&mushaf=5&per_page=1000`
    );
    const decorated = (data.verses || []).map(v => ({
      ...v,
      arabic_text: v.text_qpc_hafs || v.text_uthmani || '',
    }));
    fs.writeFileSync(
      outFile,
      JSON.stringify({ pageNumber: p, mushaf: 'madani-standard', verses: decorated }, null, 2)
    );
    if (p % 100 === 0 || p === 604) console.log(`  Page ${p}/604`);
    await delay(200);
  }
  console.log('  Done\n');

  // 6. Translations (default: 85)
  console.log('[6/6] Fetching translations (ID: 85)...');
  const transDir = path.join(OUTPUT_DIR, 'translations', '85');
  if (!fs.existsSync(transDir)) fs.mkdirSync(transDir, { recursive: true });

  for (const ch of chapters) {
    const outFile = path.join(transDir, `${ch.id}.json`);
    if (fs.existsSync(outFile)) {
      if (ch.id % 20 === 0 || ch.id === 114) console.log(`  Surah ${ch.id}/114 (skipped)`);
      continue;
    }
    const data = await fetchJson(
      `${QURAN_API}/translations/85?chapter_number=${ch.id}`
    );
    fs.writeFileSync(
      outFile,
      JSON.stringify({ chapterId: ch.id, translationId: 85, translations: data.translations || [] }, null, 2)
    );
    if (ch.id % 20 === 0 || ch.id === 114) console.log(`  Surah ${ch.id}/114`);
    await delay(150);
  }
  console.log('  Done\n');

  // Summary
  const totalSize = getDirSize(OUTPUT_DIR);
  console.log('=== Export Complete ===');
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  fs.writeFileSync(markerFile, Date.now().toString());
}

function getDirSize(dir) {
  let size = 0;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    size += stat.isDirectory() ? getDirSize(full) : stat.size;
  }
  return size;
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
