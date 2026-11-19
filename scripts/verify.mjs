/** Integration check only. Diagnostic captures are ignored, never submission shots. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

process.env.TMPDIR = resolve('.verify');

mkdirSync('.verify', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || (existsSync('/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome') ? '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome' : undefined),
  headless: true,
  env: { ...process.env, XDG_CONFIG_HOME: resolve('.verify/config'), XDG_CACHE_HOME: resolve('.verify/cache') },
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
const external = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`));
page.on('request', request => {
  if (!request.url().startsWith('http://127.0.0.1:8080/') && !request.url().startsWith('data:')) external.push(request.url());
});
try {
  console.log('Loading offline city…');
  await page.goto('http://127.0.0.1:8080/game/index.html');
  await page.waitForFunction(() => window.game?.ready, { timeout: 30000 });
  await page.waitForTimeout(600);
  const initial = await page.evaluate(() => game.snapshot());
  assert.equal(initial.world.districts, 14);
  assert(initial.world.buildings > 200);
  assert.equal(initial.player.mode, 'on-foot');
  assert(initial.render.triangles > 10000);
  console.log('Rendering verified:', initial.render);
  await page.screenshot({ path: '.verify/city.png' });
  await page.evaluate(() => game.pause(true));
  await page.keyboard.press('KeyE');
  await page.evaluate(() => game.step(1));
  assert.equal((await page.evaluate(() => game.snapshot())).player.mode, 'driving');
  await page.keyboard.down('KeyW');
  await page.evaluate(() => game.step(100));
  await page.keyboard.up('KeyW');
  const driven = await page.evaluate(() => game.snapshot());
  console.log('Driving verified:', driven.player.speed.toFixed(2), 'm/s');
  assert(driven.player.speed > 4, 'Car must accelerate');
  assert(driven.player.z < initial.player.z - 3, 'Car must travel forward');
  await page.screenshot({ path: '.verify/driving.png' });
  await page.keyboard.down('Space');
  await page.evaluate(() => game.step(100));
  await page.keyboard.up('Space');
  await page.keyboard.press('KeyE');
  await page.evaluate(() => game.step(1));
  const exited = await page.evaluate(() => game.snapshot());
  assert.equal(exited.player.mode, 'on-foot');
  await page.keyboard.down('KeyW');
  await page.evaluate(() => game.step(45));
  await page.keyboard.up('KeyW');
  const walked = await page.evaluate(() => game.snapshot());
  assert(Math.hypot(walked.player.x - exited.player.x, walked.player.z - exited.player.z) > 1);
  const hooks = await page.evaluate(() => {
    game.setMoney(4200);
    game.setRespect(7);
    game.setWantedLevel(4);
    game.setTimeOfDay(12);
    game.setTimeOfDay(17.4);
    const chase = game.spawnPoliceChase({ count: 4, helicopter: true });
    game.teleportPlayer(220, 130, 0);
    return { chase, snapshot: game.snapshot() };
  });
  assert.equal(hooks.snapshot.progress.money, 4200);
  assert.equal(hooks.chase.implemented, false);
  assert(hooks.snapshot.sky.sunElevation > 0 && hooks.snapshot.sky.sunElevation < 0.3);
  const collision = await page.evaluate(() => {
    const box = game.collision.obstacles.find(box => box.label === 'Glasswake');
    const p = { x: box.minX - 3, z: (box.minZ + box.maxZ) / 2 };
    game.collision.move(p, 8, 0, 0.42);
    return { p, edge: box.minX };
  });
  assert(collision.p.x < collision.edge - 0.4, 'Building must stop a swept pedestrian');
  await page.evaluate(() => game.step(1));
  await page.screenshot({ path: '.verify/coast.png' });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  const report = { status: 'PASS', initial, driven: driven.player, walked: walked.player, hooks,
    consoleErrors: errors, externalRequests: external };
  writeFileSync('.verify/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
