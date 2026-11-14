#!/usr/bin/env node
/**
 * Films the REAL Field Shift platform as one continuous walkthrough with a visible, human-paced cursor, and writes
 * the second each step begins so the composition can cut the footage into its eight steps:
 *
 *   1 pick       /map?year=2026 → the Kostanay node is clicked, the season summary opens
 *   2 season     the Season slider is dragged 2026 → 2025 (the year numeral and the nodes change), then
 *                "Open full field page →"
 *   3 overview   /field/kostanay-01?year=2025, the verdict, the risk score, the sowing date
 *   4–8          the Water, Heat, Sowing, Replay and Confidence tabs
 *
 * Output: public/tour.mp4 (H.264, 1920×1080, 30 fps) and public/tour.json ({ seconds, trimSeconds, steps: [{ id,
 * startSec, click: { sec, x, y } | null }] }, seconds in the mp4, x/y in output pixels); the raw .webm and the exact
 * ffmpeg command land in capture/out/. Target: FIELD_SHIFT_URL (default https://shield-field.vercel.app); if it is
 * unreachable and LOCAL_APP_DIR points at a checkout of the app, `pnpm build && pnpm start` runs there and
 * http://localhost:3000 is filmed. Needs `ffmpeg`/`ffprobe` on PATH. HTTPS_PROXY, when set, is passed to Chromium.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'capture', 'out');
const PUBLIC = join(ROOT, 'public');

const LIVE_URL = (process.env.FIELD_SHIFT_URL ?? 'https://shield-field.vercel.app').replace(/\/$/, '');
const LOCAL_URL = 'http://localhost:3000';
const OPEN_YEAR = 2026;
const PICK_YEAR = 2025;
const FIELD_NODE = /^Kostanay:/;

/** The clip is always 1920×1080. */
const OUTPUT = { width: 1920, height: 1080 };
/**
 * The browser viewport the page is laid out in. The app's content column is 1200 px wide, so at a 1920 px viewport the
 * UI is small on screen; 1440×810 (the default) is laid out 1.33× larger. Playwright records at the viewport's CSS
 * size (it never upscales), rendered at deviceScaleFactor 2 for a supersampled picture, and the ffmpeg step scales the
 * recording to 1920×1080. CAPTURE_VIEWPORT=1920x1080 films at native size instead.
 */
const VIEWPORT = parseViewport(process.env.CAPTURE_VIEWPORT) ?? { width: 1440, height: 810 };
const OUTPUT_SCALE = OUTPUT.width / VIEWPORT.width;
/** The arrow is ~34 px in the clip whatever the viewport. */
const CURSOR_PX = Math.round(34 / OUTPUT_SCALE);
const GLIDE_MS = 850;
const CLICK_PAUSE_MS = 260;
const NAV_TIMEOUT = 90_000;

/** How long each step is held on screen after its action, so every step's footage is at least its segment's length. */
const HOLD_MS = { pick: 2600, season: 1300, overview: 4300, water: 2600, heat: 2600, sowing: 2900, replay: 2900, confidence: 2800 };

function parseViewport(value) {
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(value ?? '');
  return match === null ? null : { width: Number(match[1]), height: Number(match[2]) };
}

/* --------------------------------------------------------------------------------------------- the visible cursor */

/**
 * Injected into every document before any script runs (survives navigation): a fixed-position arrow cursor, and two
 * promises the tour drives — __glide(x, y, ms) eases the arrow along a straight path with requestAnimationFrame, and
 * __ripple(x, y) draws a quick click ring. The last position is kept in sessionStorage so a full page load redraws the
 * arrow where it was instead of jumping.
 */
const CURSOR_SCRIPT = String.raw`(() => {
  const SIZE = __CURSOR_PX__;
  const TIP = { x: (5 / 24) * SIZE, y: (3 / 24) * SIZE };
  const KEY = '__fs_cursor_pos';
  const INK = '#1A1C1E';
  function place(el, x, y) {
    el.style.transform = 'translate(' + (x - TIP.x) + 'px,' + (y - TIP.y) + 'px)';
    el.dataset.x = String(x);
    el.dataset.y = String(y);
    try { sessionStorage.setItem(KEY, JSON.stringify({ x, y })); } catch {}
  }
  function ensure() {
    if (!document.body) return null;
    let el = document.getElementById('__fs_cursor');
    if (el) return el;
    el = document.createElement('div');
    el.id = '__fs_cursor';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;left:0;top:0;width:' + SIZE + 'px;height:' + SIZE + 'px;z-index:2147483647;pointer-events:none;will-change:transform;' +
      'filter:drop-shadow(0 1px 1.5px rgba(20,20,20,.45)) drop-shadow(0 6px 14px rgba(20,20,20,.22));';
    el.innerHTML = '<svg viewBox="0 0 24 24" width="' + SIZE + '" height="' + SIZE + '" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M5 3 L5 19.6 L9.4 15.7 L12.5 22.2 L15.4 20.9 L12.4 14.5 L18.7 14.3 Z" fill="' + INK + '" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.body.appendChild(el);
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch {}
    const start = saved && typeof saved.x === 'number' ? saved : { x: window.innerWidth * 0.46, y: window.innerHeight * 0.66 };
    place(el, start.x, start.y);
    return el;
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  window.__glide = (x, y, ms) => new Promise((done) => {
    const el = ensure();
    if (!el) return done();
    const x0 = Number(el.dataset.x), y0 = Number(el.dataset.y);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = ease(p);
      place(el, x0 + (x - x0) * e, y0 + (y - y0) * e);
      if (p < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  window.__ripple = (x, y) => new Promise((done) => {
    const ring = document.createElement('div');
    ring.setAttribute('aria-hidden', 'true');
    ring.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;' +
      'border:2.5px solid ' + INK + ';z-index:2147483646;pointer-events:none;opacity:.85;transform:scale(.5);' +
      'transition:transform .45s cubic-bezier(.2,.7,.2,1),opacity .45s ease-out;';
    document.body.appendChild(ring);
    requestAnimationFrame(() => requestAnimationFrame(() => { ring.style.transform = 'scale(3.4)'; ring.style.opacity = '0'; }));
    setTimeout(() => { ring.remove(); done(); }, 470);
  });
  window.__cursorPress = (down) => {
    const el = ensure();
    if (!el) return;
    el.style.transition = 'filter .08s ease-out';
    el.style.filter = down
      ? 'drop-shadow(0 0.5px 1px rgba(20,20,20,.5)) drop-shadow(0 2px 5px rgba(20,20,20,.25))'
      : 'drop-shadow(0 1px 1.5px rgba(20,20,20,.45)) drop-shadow(0 6px 14px rgba(20,20,20,.22))';
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure); else ensure();
  new MutationObserver(() => { if (document.body && !document.getElementById('__fs_cursor')) ensure(); })
    .observe(document.documentElement, { childList: true });
})();`;

/* ------------------------------------------------------------------------------------------------------- helpers */

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const log = (...parts) => console.log('[capture]', ...parts);

/** Waits for a locator and, if it never shows, prints the page's accessibility tree so the failure can be read. */
async function expectVisible(page, locator, label, timeout = NAV_TIMEOUT) {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
  } catch (error) {
    console.error(`[capture] "${label}" did not appear within ${timeout} ms at ${page.url()}`);
    try {
      const snapshot = await page.locator('body').ariaSnapshot();
      console.error('[capture] ARIA snapshot (first 6000 chars):\n' + snapshot.slice(0, 6000));
    } catch {}
    throw error;
  }
}

/** Brings an element into the viewport with a smooth scroll (centred), instead of Playwright's instant jump. */
async function reveal(page, locator) {
  const target = locator.first();
  const box = await target.boundingBox();
  if (box === null) return;
  const inView = box.y >= 40 && box.y + box.height <= VIEWPORT.height - 40;
  if (inView) return;
  await target.evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await sleep(750);
}

/** Centre of an element in viewport CSS pixels. */
async function centreOf(locator) {
  const box = await locator.first().boundingBox();
  if (box === null) throw new Error('element has no bounding box');
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2), box };
}

/** Eases the visible cursor to the element's centre, pauses, ripples, then performs the REAL click. */
async function glide(page, locator, label, clock, ms = GLIDE_MS) {
  const target = locator.first();
  await expectVisible(page, target, label);
  await reveal(page, target);
  const { x, y } = await centreOf(target);
  await page.evaluate(([gx, gy, gms]) => window.__glide(gx, gy, gms), [x, y, ms]);
  await page.mouse.move(x, y);
  await sleep(CLICK_PAUSE_MS);
  await page.evaluate(([rx, ry]) => { window.__cursorPress(true); return window.__ripple(rx, ry); }, [x, y]).catch(() => {});
  const sec = clock();
  await target.click();
  await page.evaluate(() => window.__cursorPress(false)).catch(() => {});
  log(`clicked ${label} at ${x},${y} (${sec.toFixed(2)} s)`);
  return { sec, x, y };
}

/** Drags a range input from its current value to `value`, cursor and real pointer together. */
async function dragSlider(page, locator, value, clock) {
  const target = locator.first();
  await reveal(page, target);
  const { box } = await centreOf(target);
  const min = Number(await target.getAttribute('min'));
  const max = Number(await target.getAttribute('max'));
  const current = Number(await target.inputValue());
  const thumbHalf = 10;
  const xFor = (v) => Math.round(box.x + thumbHalf + ((v - min) / (max - min)) * (box.width - 2 * thumbHalf));
  const y = Math.round(box.y + box.height / 2);
  const from = xFor(current);
  const to = xFor(value);
  await page.evaluate(([gx, gy, gms]) => window.__glide(gx, gy, gms), [from, y, GLIDE_MS]);
  await page.mouse.move(from, y);
  await sleep(CLICK_PAUSE_MS);
  await page.evaluate(() => window.__cursorPress(true)).catch(() => {});
  const sec = clock();
  await page.mouse.down();
  const steps = 22;
  for (let i = 1; i <= steps; i += 1) {
    const p = i / steps;
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const x = Math.round(from + (to - from) * e);
    await page.mouse.move(x, y);
    await page.evaluate(([gx, gy]) => window.__glide(gx, gy, 20), [x, y]);
    await sleep(28);
  }
  await page.mouse.up();
  await page.evaluate(() => window.__cursorPress(false)).catch(() => {});
  // The drag lands on the nearest year; correct by keyboard if it missed by one.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const now = Number(await target.inputValue());
    if (now === value) break;
    await target.focus();
    await page.keyboard.press(now > value ? 'ArrowLeft' : 'ArrowRight');
    await sleep(120);
  }
  log(`dragged the Season slider ${current} → ${await target.inputValue()} (${sec.toFixed(2)} s)`);
  return { sec, x: to, y };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
}

function haveBinary(name) {
  const result = spawnSync(name, ['-version'], { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function probeSeconds(file) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffprobe failed on ${file}: ${result.stderr}`);
  return Number.parseFloat(result.stdout.trim());
}

function proxyOption() {
  const server = process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy;
  return server ? { proxy: { server, bypass: 'localhost,127.0.0.1' } } : {};
}

/* ------------------------------------------------------------------------------------------------------- target */

async function reachable(browser, base) {
  const page = await browser.newPage();
  try {
    const response = await page.goto(`${base}/map?year=${OPEN_YEAR}`, { waitUntil: 'domcontentloaded', timeout: 25_000 });
    const ok = response !== null && response.ok();
    log(`${base} → ${response === null ? 'no response' : response.status()}`);
    return ok;
  } catch (error) {
    log(`${base} unreachable: ${error.message.split('\n')[0]}`);
    return false;
  } finally {
    await page.close();
  }
}

/** The URL to film and, for the local fallback, the server process to stop at the end. */
async function resolveTarget(browser) {
  if (await reachable(browser, LIVE_URL)) return { base: LIVE_URL, server: null };
  const appDir = process.env.LOCAL_APP_DIR;
  if (!appDir) {
    throw new Error(`${LIVE_URL} is unreachable and LOCAL_APP_DIR is not set. Set LOCAL_APP_DIR=/path/to/shield_field to build and film the app locally.`);
  }
  log(`falling back to a local build in ${appDir}`);
  run('pnpm', ['build'], { cwd: appDir });
  const server = spawn('pnpm', ['start'], { cwd: appDir, stdio: 'inherit' });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await reachable(browser, LOCAL_URL)) return { base: LOCAL_URL, server };
    await sleep(2000);
  }
  server.kill();
  throw new Error('the local server did not come up on port 3000 within 90 s');
}

/* ---------------------------------------------------------------------------------------------------- the tour */

async function recordTour(browser, base) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT, size: VIEWPORT },
    reducedMotion: 'no-preference',
    locale: 'en-US',
    colorScheme: 'light',
  });
  await context.addInitScript(CURSOR_SCRIPT.replace('__CURSOR_PX__', String(CURSOR_PX)));
  const page = await context.newPage();
  const t0 = Date.now();
  const clock = () => (Date.now() - t0) / 1000;
  const steps = [];
  const begin = (id) => {
    const startSec = clock();
    steps.push({ id, startSec, click: null });
    log(`step ${steps.length} ${id} begins at ${startSec.toFixed(2)} s`);
  };
  const clicked = (click) => {
    steps[steps.length - 1].click = click;
  };

  await page.goto(`${base}/map?year=${OPEN_YEAR}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await expectVisible(page, page.getByRole('heading', { name: 'Pick a field. Read its season.' }), 'map page heading');
  const paintSec = clock();
  const node = page.getByRole('button', { name: FIELD_NODE });
  await expectVisible(page, node, 'Kostanay node');
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => log('networkidle not reached in 5 s; continuing'));
  await sleep(800);

  // 1 · pick a field
  begin('pick');
  clicked(await glide(page, node, 'Kostanay node', clock));
  const open = page.getByRole('link', { name: 'Open full field page →' });
  await expectVisible(page, open, '"Open full field page →"');
  await sleep(HOLD_MS.pick);

  // 2 · choose the season: drag the slider, let the map and the panel follow, then open the full page
  begin('season');
  const slider = page.getByRole('slider', { name: 'Season' });
  await expectVisible(page, slider, 'Season slider');
  clicked(await dragSlider(page, slider, PICK_YEAR, clock));
  await expectVisible(page, open, '"Open full field page →" after the season change');
  await sleep(HOLD_MS.season);
  await glide(page, open, '"Open full field page →"', clock);

  // 3 · overview
  const title = page.locator('[data-place-title]');
  await expectVisible(page, title, 'field page title');
  await page.waitForURL((url) => url.pathname.startsWith('/field/') && url.searchParams.get('year') === String(PICK_YEAR), { timeout: NAV_TIMEOUT }).catch(() => log('field page URL did not carry the picked year; continuing'));
  begin('overview');
  await sleep(HOLD_MS.overview);

  // 4–8 · the tabs
  for (const [id, label] of [['water', 'Water'], ['heat', 'Heat'], ['sowing', 'Sowing'], ['replay', 'Replay'], ['confidence', 'Confidence']]) {
    begin(id);
    const tab = page.getByRole('tab', { name: new RegExp(`^${label}`) });
    clicked(await glide(page, tab, `${label} tab`, clock));
    await expectVisible(page, page.locator(`[data-facet="${id}"]`), `${label} facet`);
    await sleep(HOLD_MS[id]);
  }
  await sleep(500);

  const video = page.video();
  await context.close();
  const recorded = await video.path();
  const webm = join(OUT, 'tour.webm');
  renameSync(recorded, webm);
  return { webm, trim: Math.max(0, paintSec - 0.15), steps };
}

/* ------------------------------------------------------------------------------------------------------- ffmpeg */

/** Trims the blank load frames, scales the recording to 1920×1080 (lanczos), 30 fps, H.264 yuv420p. */
function encode(input, trimSeconds, output) {
  const args = [
    '-y',
    '-ss', trimSeconds.toFixed(2),
    '-i', input,
    '-an',
    '-vf', `scale=${OUTPUT.width}:${OUTPUT.height}:flags=lanczos,fps=30,format=yuv420p`,
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    output,
  ];
  const command = `ffmpeg ${args.map((arg) => (arg.includes(' ') || arg.includes(',') ? `"${arg}"` : arg)).join(' ')}`;
  log(command);
  run('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
  return command;
}

/* --------------------------------------------------------------------------------------------------------- main */

async function main() {
  if (!haveBinary('ffmpeg') || !haveBinary('ffprobe')) {
    throw new Error('ffmpeg and ffprobe must be on PATH (https://ffmpeg.org/download.html).');
  }
  mkdirSync(OUT, { recursive: true });
  mkdirSync(PUBLIC, { recursive: true });

  const browser = await chromium.launch({
    ...proxyOption(),
    args: ['--enable-unsafe-swiftshader', '--font-render-hinting=none', '--hide-scrollbars'],
  });
  let server = null;
  try {
    const target = await resolveTarget(browser);
    server = target.server;
    log(`filming ${target.base} at a ${VIEWPORT.width}×${VIEWPORT.height} viewport; the clip is scaled to ${OUTPUT.width}×${OUTPUT.height} by ffmpeg`);
    const tour = await recordTour(browser, target.base);
    const output = join(PUBLIC, 'tour.mp4');
    const command = encode(tour.webm, tour.trim, output);
    writeFileSync(join(OUT, 'ffmpeg-commands.txt'), command + '\n');
    const seconds = probeSeconds(output);
    const toClip = (sec) => Number(Math.max(0, sec - tour.trim).toFixed(3));
    const json = {
      target: target.base,
      capturedAt: new Date().toISOString(),
      file: 'tour.mp4',
      seconds,
      trimSeconds: Number(tour.trim.toFixed(2)),
      viewport: VIEWPORT,
      steps: tour.steps.map((step) => ({
        id: step.id,
        startSec: toClip(step.startSec),
        click: step.click === null ? null : { sec: toClip(step.click.sec), x: Math.round(step.click.x * OUTPUT_SCALE), y: Math.round(step.click.y * OUTPUT_SCALE) },
      })),
    };
    writeFileSync(join(PUBLIC, 'tour.json'), JSON.stringify(json, null, 2) + '\n');
    log('done');
    log(`tour.mp4  ${seconds.toFixed(2)} s`);
    for (const [index, step] of json.steps.entries()) {
      const next = json.steps[index + 1];
      log(`  ${index + 1} ${step.id.padEnd(10)} ${step.startSec.toFixed(2)} s → ${(next ? next.startSec : seconds).toFixed(2)} s  (${((next ? next.startSec : seconds) - step.startSec).toFixed(2)} s)`);
    }
    log('ffmpeg command → capture/out/ffmpeg-commands.txt');
  } finally {
    await browser.close();
    if (server !== null) server.kill();
  }
}

main().catch((error) => {
  console.error('[capture] failed:', error);
  process.exit(1);
});
