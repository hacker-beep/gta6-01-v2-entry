/** Static development server; accepts both / and /game/index.html. */
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = fileURLToPath(new URL('game/', import.meta.url));
const flag = process.argv.indexOf('--port');
const port = Number(flag >= 0 ? process.argv[flag + 1] : process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid port');
const contentTypes: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
};
http.createServer((req, res) => {
  try {
    let route = decodeURIComponent(new URL(req.url || '/', 'http://local').pathname);
    if (route.startsWith('/game/')) route = route.slice(5);
    if (route.endsWith('/')) route += 'index.html';
    const target = path.resolve(base, '.' + route);
    if (!target.startsWith(base)) { res.writeHead(403).end(); return; }
    if (!fs.statSync(target).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, {
      'Content-Type': (contentTypes[path.extname(target)] || 'application/octet-stream') + '; charset=utf-8',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404).end('File not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Vermilion Bay: http://127.0.0.1:${port}/game/index.html`));
