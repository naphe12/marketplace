import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const index = resolve(root, 'index.html');
try {
  await stat(index);
} catch {
  console.error('Build absent : lancez npm run build avant npm start.');
  process.exit(1);
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.includes('\0')) throw new Error('Invalid path');
  } catch {
    res.writeHead(400).end();
    return;
  }
  let file = resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      // React Router handles page URLs; missing assets remain 404s.
      if (extname(pathname) || pathname.startsWith('/assets/')) {
        res.writeHead(404).end();
        return;
      }
      file = index;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(500).end();
  }
}).listen(Number(process.env.PORT ?? 3000), '0.0.0.0', () => {
  console.log(`Frontend disponible sur le port ${process.env.PORT ?? 3000}`);
});
