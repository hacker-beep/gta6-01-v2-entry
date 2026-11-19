import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = join(root, 'screenshots');
const port = Number(process.env.PORT || 8088);
const origin = `http://127.0.0.1:${port}`;
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
if (shots.length !== 4 || shots[0].name !== '1-cover.jpg') throw Error('shots.json must list the cover first and exactly four frames');
mkdirSync(output, { recursive: true });

const require = createRequire(import.meta.url);
const playwright = await import(pathToFileURL(require.resolve('playwright')).href);
const { chromium } = playwright.chromium ? playwright : playwright.default;
const server = spawn(process.execPath, [join(root, 'serve.ts'), '--port', String(port)], {
  cwd: root,
  stdio: 'inherit',
});
let browser;

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw Error(`Local game server exited with ${server.exitCode}`);
    try {
      const response = await fetch(`${origin}/`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolveDelay => setTimeout(resolveDelay, 150));
  }
  throw Error('Local game server did not become ready');
}

try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-proxy-server',
    ],
  });

  for (const shot of shots) {
    const url = new URL(shot.query, `${origin}/`);
    const scene = url.searchParams.get('scene');
    if (!scene) throw Error(`${shot.name} query must select a scene`);
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText || 'request failed'}`));
    page.on('request', request => {
      if (new URL(request.url()).origin !== origin) errors.push(`Unexpected external request: ${request.url()}`);
    });

    await page.goto(url.href, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
    await page.waitForTimeout(1200);
    if (errors.length) throw Error(`${scene}: ${errors.join('\n')}`);

    const file = join(output, shot.name);
    await page.screenshot({ path: file, type: 'jpeg', quality: 84 });
    const bytes = statSync(file).size;
    if (bytes > 262144) throw Error(`${shot.name} is ${bytes} bytes; maximum is 262144`);
    console.log(`${shot.name} (${scene}): ${bytes} bytes`);
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
