import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../public/fonts');

const FONTS = [
  {
    name: 'KFGQPCHafsUthmanic',
    url: 'https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2',
    family: 'KFGQPC Hafs Uthmanic Script',
    format: 'woff2',
  },
  {
    name: 'KFGQPCUthmanTahaNaskh',
    url: 'https://cdn.jsdelivr.net/gh/nawhadq/quran-fonts@master/UthmanTN1Ver18.otf',
    family: 'KFGQPC Uthman Taha Naskh',
    format: 'opentype',
  },
];

async function downloadBinary(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.arrayBuffer();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

async function main() {
  console.log('=== Downloading Quran Fonts ===\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalSize = 0;
  const fontFaces = [];

  for (const font of FONTS) {
    const fileName = `${font.name}.${font.format === 'woff2' ? 'woff2' : font.format === 'opentype' ? 'otf' : 'ttf'}`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    if (fs.existsSync(filePath)) {
      const size = fs.statSync(filePath).size;
      console.log(`✓ ${fileName} already exists (${(size / 1024 / 1024).toFixed(1)} MB)`);
      totalSize += size;
    } else {
      console.log(`Downloading ${fileName}...`);
      const buffer = await downloadBinary(font.url);
      fs.writeFileSync(filePath, Buffer.from(buffer));
      const size = buffer.byteLength;
      console.log(`✓ ${fileName} (${(size / 1024 / 1024).toFixed(1)} MB)`);
      totalSize += size;
    }

    fontFaces.push({
      family: font.family,
      fileName,
      format: font.format,
    });
  }

  // Generate CSS
  let css = '/* Auto-generated - local Quran fonts */\n\n';
  for (const font of fontFaces) {
    css += `@font-face {\n`;
    css += `  font-family: '${font.family}';\n`;
    css += `  src: url('/fonts/${font.fileName}') format('${font.format}');\n`;
    css += `  font-weight: normal;\n`;
    css += `  font-style: normal;\n`;
    css += `  font-display: swap;\n`;
    css += `}\n\n`;
  }

  const cssPath = path.join(OUTPUT_DIR, 'quran-fonts.css');
  fs.writeFileSync(cssPath, css);
  console.log(`\n✓ Generated quran-fonts.css`);
  console.log(`\nTotal: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
