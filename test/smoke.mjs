// Smoke test: mounts every game plus the arcade in headless Chrome,
// starts each one, pokes the controls, and fails on any page/console error.
//
// puppeteer is the only requirement and is not vendored here — make it
// resolvable first, e.g.:
//   npm install --no-save --no-package-lock puppeteer
// or point NODE_PATH at a node_modules that already has it:
//   NODE_PATH=/path/to/node_modules node test/smoke.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer');

const DEMO = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'demo', 'index.html');
const GAMES = ['runner', 'invaders', 'breakout', 'snake', 'pong', 'flappy', 'maze', 'asteroids', 'whack', '2048'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? 'ok' : 'FAIL'} - ${label}`);
  if (!ok) failures.push(label);
};

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 900 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

await page.goto(DEMO, { waitUntil: 'networkidle0' });
await sleep(400);

// every game registered and mounted?
const registered = await page.evaluate(() => Object.keys(window.Games404 || {}));
for (const g of GAMES) check(registered.includes(g), `registered: ${g}`);

const mounted = await page.evaluate(() => {
  const out = {};
  document.querySelectorAll('[data-404-game]').forEach((el) => {
    out[el.getAttribute('data-404-game')] = !!el.querySelector('canvas');
  });
  return out;
});
for (const g of GAMES) check(mounted[g] === true, `canvas mounted: ${g}`);

// start each game and poke the controls
for (const g of GAMES) {
  const el = await page.$(`[data-404-game="${g}"] canvas`);
  await el.click();
  await sleep(300);
  await el.click();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await sleep(500);
  check(true, `played: ${g}`);
}

// arcade: pick a game, then back to the menu
const tile = await page.evaluateHandle(() =>
  [...document.querySelectorAll('[data-404-arcade] button')].find((b) => b.textContent.includes('RUNNER')));
await tile.asElement().click();
await sleep(500);
check(await page.evaluate(() => !!document.querySelector('[data-404-arcade] canvas')), 'arcade: game opens');
const backBtn = await page.evaluateHandle(() =>
  [...document.querySelectorAll('[data-404-arcade] button')].find((b) => b.textContent.includes('MENU')));
await backBtn.asElement().click();
await sleep(200);
check(await page.evaluate(() => !document.querySelector('[data-404-arcade] canvas')), 'arcade: back to menu');

// theme variables follow a live toggle (games re-read them once a second)
const theme = await page.evaluate(() => new Promise((res) => {
  const c = document.querySelector('[data-404-game="runner"] canvas');
  const grab = () => {
    const s = c.width / 600;
    return [...c.getContext('2d').getImageData(Math.round(300 * s), Math.round(129 * s), 1, 1).data.slice(0, 3)];
  };
  const before = grab();
  document.body.classList.add('dark');
  setTimeout(() => res({ before, after: grab() }), 1600);
}));
check(theme.before.join() !== theme.after.join(), 'theme: live light/dark switch');

check(errors.length === 0, `zero page errors${errors.length ? ' — ' + errors.join(' | ') : ''}`);

await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall green');
process.exitCode = failures.length ? 1 : 0;
