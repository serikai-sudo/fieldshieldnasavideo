#!/usr/bin/env node
/**
 * Films the REAL Field Shift platform with Playwright and a visible, human-paced cursor, then converts the recordings
 * with ffmpeg into the two clips the Remotion composition expects, plus four screenshots for the Scene 5 strip:
 *
 *   public/clip-magic.mp4   /map?year=2026 → click the Kostanay node → "Open full field page →" → Sowing tab → "May 28"
 *   public/clip-replay.mp4  /field/kostanay-01?year=2026 → Replay tab → the 2012 season replayed
 *   public/shot-water.png, shot-heat.png, shot-money.png, shot-crops.png   (1920×1080 viewport captures)
 *   public/clips.json       durations and every event second (clicks, panels, tabs ready), so the composition cuts
 *                           each clip on its events and cues each voice line on the right picture
 *   capture/out/            the raw .webm recordings and ffmpeg-commands.txt (the exact commands that were run)
 *
 * Target: FIELD_SHIFT_URL (default https://shield-field.vercel.app). If it is unreachable and LOCAL_APP_DIR points at a
 * checkout of the app, `pnpm build && pnpm start` runs there and http://localhost:3000 is filmed instead (same code).
 * Needs `ffmpeg`/`ffprobe` on PATH. HTTPS_PROXY, when set, is passed to Chromium (sandboxes); otherwise direct.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { calibrateAll } from './calibrate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'capture', 'out');
const PUBLIC = join(ROOT, 'public');

const LIVE_URL = (process.env.FIELD_SHIFT_URL ?? 'https://shield-field.vercel.app').replace(/\/$/, '');
const LOCAL_URL = 'http://localhost:3000';
const YEAR = '2026';
const FIELD_ID = 'kostanay-01';
/** Rudny district: a committed demo point, so /place answers from disk; the crop switcher is on every /place page. */
const PLACE_QUERY = `lat=52.9880&lon=63.1200&year=${YEAR}&name=Rudny`;

/** The clips are always 1920×1080. */
const OUTPUT = { width: 1920, height: 1080 };
/**
 * The browser viewport the page is laid out in. The app's content column is 1200 px wide, so at a 1920 px viewport the
 * UI is small on screen; 1440×810 (the default) is laid out 1.33× larger. Playwright records at the viewport's CSS
 * size (it never upscales, it pads with grey), rendered at deviceScaleFactor 2 for a supersampled picture, and the
 * ffmpeg step below scales the recording to 1920×1080. CAPTURE_VIEWPORT=1920x1080 films at native size instead.
 */
const VIEWPORT = parseViewport(process.env.CAPTURE_VIEWPORT) ?? { width: 1440, height: 810 };
/** Pixels of the recording per CSS pixel of the page. */
const OUTPUT_SCALE = OUTPUT.width / VIEWPORT.width;
/** The arrow is ~34 px in the recording whatever the viewport. */
const CURSOR_PX = Math.round(34 / OUTPUT_SCALE);
const GLIDE_MS = 800;
const CLICK_PAUSE_MS = 250;
const NAV_TIMEOUT = 90_000;

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

/** Eases the visible cursor to the element's centre, pauses, ripples, then performs the REAL click. */
async function glide(page, locator, label, ms = GLIDE_MS) {
  const target = locator.first();
  await expectVisible(page, target, label);
  await target.scrollIntoViewIfNeeded();
  await sleep(120);
  const box = await target.boundingBox();
  if (box === null) throw new Error(`glide: ${label} has no bounding box`);
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await page.evaluate(([gx, gy, gms]) => window.__glide(gx, gy, gms), [x, y, ms]);
  await page.mouse.move(x, y);
  await sleep(CLICK_PAUSE_MS);
  await page.evaluate(([rx, ry]) => { window.__cursorPress(true); return window.__ripple(rx, ry); }, [x, y]).catch(() => {});
  const at = Date.now();
  await target.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await page.evaluate(() => window.__cursorPress(false)).catch(() => {});
  log(`clicked ${label} at ${x},${y}`);
  return { at, x, y };
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
    const response = await page.goto(`${base}/map?year=${YEAR}`, { waitUntil: 'domcontentloaded', timeout: 25_000 });
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

/* ------------------------------------------------------------------------------------------------------- clips */

async function newRecordingContext(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: OUT, size: VIEWPORT },
    reducedMotion: 'no-preference',
    locale: 'en-US',
    colorScheme: 'light',
  });
  await context.addInitScript(CURSOR_SCRIPT.replace('__CURSOR_PX__', String(CURSOR_PX)));
  return context;
}

/** Closes the context (which finalises the recording) and moves the .webm to a stable name. */
async function finishRecording(context, page, name) {
  const video = page.video();
  await context.close();
  const recorded = await video.path();
  const target = join(OUT, `${name}.webm`);
  renameSync(recorded, target);
  return target;
}

/** The map → field → Sowing tour. Returns the raw recording and the seconds to trim off its head (blank load frames). */
/**
 * Turns the moments of a recording into seconds of the encoded clip (after the head trim) and clicks into output
 * pixels, so the composition can cut the clip on its events and cue each voice line on the right picture.
 */
function eventClock(t0, trimOf) {
  const sec = (at) => Number(((at - t0) / 1000 - trimOf()).toFixed(3));
  return {
    at: sec,
    click: (c) => ({ sec: sec(c.at), x: Math.round(c.x * OUTPUT_SCALE), y: Math.round(c.y * OUTPUT_SCALE) }),
  };
}

/** The map → field → Sowing tour; every event is logged so the composition can cut on it. */
async function recordMagic(browser, base) {
  const context = await newRecordingContext(browser);
  const page = await context.newPage();
  const t0 = Date.now();
  let trim = 0;
  const clock = eventClock(t0, () => trim);
  const raw = {};
  await page.goto(`${base}/map?year=${YEAR}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await expectVisible(page, page.getByRole('heading', { name: 'Pick a field. Read its season.' }), 'map page heading');
  const tPaint = Date.now();
  const node = page.getByRole('button', { name: /^Kostanay:/ });
  await expectVisible(page, node, 'Kostanay node');
  // Basemap tiles: wait for the network to go quiet, but never longer than the tour can afford.
  await page.waitForLoadState('networkidle', { timeout: 6_000 }).catch(() => log('networkidle not reached in 6 s; continuing'));
  await sleep(900); // the map is fully drawn before the cursor moves
  raw.mapReady = Date.now();
  raw.nodeClick = await glide(page, node, 'Kostanay node');
  const open = page.getByRole('link', { name: 'Open full field page →' });
  await expectVisible(page, open, '"Open full field page →"');
  raw.panelShown = Date.now();
  await sleep(2000); // the summary panel: "High caution" is read on screen
  raw.openClick = await glide(page, open, '"Open full field page →"');
  const sowingTab = page.getByRole('tab', { name: /^Sowing/ });
  await expectVisible(page, sowingTab, 'Sowing tab (field page)');
  await expectVisible(page, page.locator('[data-place-title]'), 'field page title');
  raw.fieldPage = Date.now();
  await sleep(700);
  raw.sowingClick = await glide(page, sowingTab, 'Sowing tab');
  await expectVisible(page, page.getByText(/^Sow around May 28/), '"Sow around May 28"');
  raw.sowingReady = Date.now();
  await sleep(4000); // the dial holds long enough for its whole voice line
  const file = await finishRecording(context, page, 'magic');
  trim = Number(Math.max(0, (tPaint - t0) / 1000 - 0.15).toFixed(2));
  const events = {
    mapReady: clock.at(raw.mapReady),
    nodeClick: clock.click(raw.nodeClick),
    panelShown: clock.at(raw.panelShown),
    openClick: clock.click(raw.openClick),
    fieldPage: clock.at(raw.fieldPage),
    sowingClick: clock.click(raw.sowingClick),
    sowingReady: clock.at(raw.sowingReady),
  };
  return { file, trim, events };
}

/** The field page → Replay tour, with its events. */
async function recordReplay(browser, base) {
  const context = await newRecordingContext(browser);
  const page = await context.newPage();
  const t0 = Date.now();
  let trim = 0;
  const clock = eventClock(t0, () => trim);
  const raw = {};
  await page.goto(`${base}/field/${FIELD_ID}?year=${YEAR}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await expectVisible(page, page.locator('[data-place-title]'), 'field page title');
  const tPaint = Date.now();
  const replayTab = page.getByRole('tab', { name: /^Replay/ });
  await expectVisible(page, replayTab, 'Replay tab');
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  await sleep(900);
  raw.replayClick = await glide(page, replayTab, 'Replay tab');
  await expectVisible(page, page.getByRole('heading', { name: 'How do we know? We replayed 2012.' }), 'replay heading');
  await expectVisible(page, page.getByText('What really happened · 2012 harvest'), '"What really happened · 2012 harvest"');
  raw.replayReady = Date.now();
  await sleep(4200); // the replay holds long enough for its whole voice line
  const file = await finishRecording(context, page, 'replay');
  trim = Number(Math.max(0, (tPaint - t0) / 1000 - 0.15).toFixed(2));
  return { file, trim, events: { replayClick: clock.click(raw.replayClick), replayReady: clock.at(raw.replayReady) } };
}

/* -------------------------------------------------------------------------------------------------- screenshots */

async function takeScreenshots(browser, base) {
  // The same layout as the clips, captured at exactly 1920×1080 device pixels.
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: OUTPUT_SCALE, reducedMotion: 'reduce', locale: 'en-US', colorScheme: 'light' });
  const page = await context.newPage();
  const shot = async (name) => {
    await sleep(500);
    const file = join(PUBLIC, name);
    await page.screenshot({ path: file, scale: 'device', animations: 'disabled' });
    log(`saved public/${name}`);
  };
  await page.goto(`${base}/field/${FIELD_ID}?year=${YEAR}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await expectVisible(page, page.locator('[data-place-title]'), 'field page title');
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  await page.getByRole('tab', { name: /^Water/ }).click();
  await expectVisible(page, page.locator('[data-facet="water"]'), 'Water facet');
  await shot('shot-water.png');

  await page.getByRole('tab', { name: /^Heat/ }).click();
  await expectVisible(page, page.locator('[data-facet="heat"]'), 'Heat facet');
  await shot('shot-heat.png');

  await page.getByRole('tab', { name: /^Sowing/ }).click();
  const money = page.getByRole('heading', { name: 'The price of timing' });
  await expectVisible(page, money, '"The price of timing"');
  await money.evaluate((element) => {
    element.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -120);
  });
  await shot('shot-money.png');

  await page.goto(`${base}/place?${PLACE_QUERY}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
  await expectVisible(page, page.getByRole('navigation', { name: 'Crop' }), 'crop switcher');
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await shot('shot-crops.png');
  await context.close();
}

/* ------------------------------------------------------------------------------------------------------- ffmpeg */

/** Trims the blank load frames, scales the recording to 1920×1080 (lanczos), 30 fps, H.264 yuv420p. */
function encodeClip(input, trimSeconds, outputName) {
  const output = join(PUBLIC, outputName);
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
  return { output, command, seconds: probeSeconds(output) };
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
    log(`filming ${target.base} at a ${VIEWPORT.width}×${VIEWPORT.height} viewport; clips are scaled to ${OUTPUT.width}×${OUTPUT.height} by ffmpeg`);

    const magic = await recordMagic(browser, target.base);
    log(`magic recorded → ${magic.file} (trim ${magic.trim.toFixed(2)} s)`);
    const replay = await recordReplay(browser, target.base);
    log(`replay recorded → ${replay.file} (trim ${replay.trim.toFixed(2)} s)`);

    const encodedMagic = encodeClip(magic.file, magic.trim, 'clip-magic.mp4');
    const encodedReplay = encodeClip(replay.file, replay.trim, 'clip-replay.mp4');

    const commands = [encodedMagic.command, encodedReplay.command].join('\n') + '\n';
    writeFileSync(join(OUT, 'ffmpeg-commands.txt'), commands);
    const clips = {
      target: target.base,
      capturedAt: new Date().toISOString(),
      magic: { file: 'clip-magic.mp4', seconds: encodedMagic.seconds, trimSeconds: Number(magic.trim.toFixed(2)), events: magic.events },
      replay: { file: 'clip-replay.mp4', seconds: encodedReplay.seconds, trimSeconds: Number(replay.trim.toFixed(2)), events: replay.events },
    };
    const offsets = calibrateAll(clips);
    log(`event calibration against the pixels (seconds): ${JSON.stringify(offsets)}`);
    writeFileSync(join(PUBLIC, 'clips.json'), JSON.stringify(clips, null, 2) + '\n');

    log('done');
    log(`clip-magic.mp4   ${encodedMagic.seconds.toFixed(2)} s`);
    log(`clip-replay.mp4  ${encodedReplay.seconds.toFixed(2)} s`);
    log('ffmpeg commands → capture/out/ffmpeg-commands.txt');
  } finally {
    await browser.close();
    if (server !== null) server.kill();
  }
}

main().catch((error) => {
  console.error('[capture] failed:', error);
  process.exit(1);
});
