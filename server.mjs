import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { createGzip } from 'node:zlib';

const root = resolve(process.cwd(), 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end(); }
  const candidate = resolve(root, `.${path}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
  let file = candidate;
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = resolve(file, 'index.html');
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
  } catch {
    // Client-side routes return the shell; missing assets remain 404s.
    if (extname(path) || !String(req.headers.accept || '').includes('text/html')) { res.writeHead(404); return res.end(); }
    file = resolve(root, 'index.html');
    try { await stat(file); } catch { res.writeHead(503); return res.end('Frontend build unavailable'); }
  }
  const cacheControl = file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
  const extension = extname(file).toLowerCase();
  const gzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(req.headers['accept-encoding'] || '') && ['.html', '.js', '.css', '.json', '.webmanifest', '.svg'].includes(extension);
  res.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream', 'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff', Vary: 'Accept-Encoding', ...(gzip ? { 'Content-Encoding': 'gzip' } : {}) });
  if (req.method === 'HEAD') return res.end();
  const stream = createReadStream(file).on('error', () => res.destroy());
  if (gzip) stream.pipe(createGzip()).on('error', () => res.destroy()).pipe(res);
  else stream.pipe(res);
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0');
