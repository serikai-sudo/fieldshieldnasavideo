#!/usr/bin/env node
/**
 * Element screenshots of the real field page for the "Inside Field Shift" scene, at device scale 2:
 *   public/ui/dock-<tab>.png  the tab bar (Overview · Water · Heat · Sowing · Replay · Confidence) with <tab> active,
 *                             one picture per tab, taken right after a real click on it
 *   public/ui/dock.json       the tab bar's CSS size and each tab's box inside it
 *   public/ui/water.png       the Water facet's first row (the two water cards)
 *   public/ui/heat.png        the Heat facet's first card (heat days)
 *   public/ui/sowing.png      the top of the Sowing dial (the decision, the bars, "Sow here · May 28")
 *   public/ui/money.png       "The price of timing"
 *   public/ui/crops.png       the crop switcher's eight pills (Wheat … Sorghum)
 *   public/ui/locations.png   Confidence → "Holds across 9 locations …" and its one-line note
 *   public/ui/backtest.png    Confidence → the national back-test card's statistic block (ρ, p, worst years caught)
 *   public/ui/sources.png     the data-source chips of a place (NASA POWER · SMAP L4 · SRTM 30 m · ESA WorldCover · MODIS NDVI)
 *   public/ui/crops-table.png the eight crops ranked for one place and season (Rudny, 2026)
 *   public/ui/shots.json      each picture's CSS size, so the composition can size its card
 * Same target rules as capture/tour.mjs (FIELD_SHIFT_URL, HTTPS_PROXY).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UI = join(ROOT, 'public', 'ui');
const BASE = (process.env.FIELD_SHIFT_URL ?? 'https://shield-field.vercel.app').replace(/\/$/, '');
const PAGE = `${BASE}/field/kostanay-01?year=2026`;
const VIEWPORT = { width: 1440, height: 810 };
const FACETS = ['overview', 'water', 'heat', 'sowing', 'replay', 'confidence'];

const log = (...parts) => console.log('[shots]', ...parts);
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function proxyOption() {
  const server = process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy;
  return server ? { proxy: { server, bypass: 'localhost,127.0.0.1' } } : {};
}

async function box(locator) {
  const b = await locator.first().boundingBox();
  if (b === null) throw new Error('element has no bounding box');
  return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
}

async function shot(locator, name, shots) {
  const target = locator.first();
  await target.scrollIntoViewIfNeeded();
  await sleep(350);
  const b = await box(target);
  await target.screenshot({ path: join(UI, `${name}.png`), animations: 'disabled' });
  shots[name] = { width: b.width, height: b.height };
  log(`${name}.png  ${b.width}×${b.height} css px`);
}

/** The tab bar right after a click on `facet`: the mouse leaves the bar so no tab wears a hover state. */
async function dockFor(page, facet, shots) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.locator(`#tab-${facet}[aria-selected="true"]`).waitFor({ state: 'visible' });
  await sleep(250);
  await shot(page.locator('[data-dock="field"]'), `dock-${facet}`, shots);
}

/** A screenshot clipped to the union of `parts` (plus a little air), for elements wider than what they hold. */
async function shotUnion(page, parts, name, shots, pad = 8, byText = false) {
  const count = await parts.count();
  if (count === 0) throw new Error(`${name}: nothing to frame`);
  await parts.first().scrollIntoViewIfNeeded();
  await sleep(350);
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (let i = 0; i < count; i += 1) {
    // byText: the box of the words themselves (a Range), not of the full-width block that holds them
    const b = byText
      ? await parts.nth(i).evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const r = range.getBoundingClientRect();
          return { x: r.left, y: r.top, width: r.width, height: r.height };
        })
      : await parts.nth(i).boundingBox();
    if (b === null) continue;
    left = Math.min(left, b.x); top = Math.min(top, b.y); right = Math.max(right, b.x + b.width); bottom = Math.max(bottom, b.y + b.height);
  }
  const clip = { x: Math.floor(left - pad), y: Math.floor(top - pad), width: Math.ceil(right - left + 2 * pad), height: Math.ceil(bottom - top + 2 * pad) };
  await page.screenshot({ path: join(UI, `${name}.png`), clip, animations: 'disabled' });
  shots[name] = { width: clip.width, height: clip.height };
  log(`${name}.png  ${clip.width}×${clip.height} css px (framed)`);
}

async function main() {
  mkdirSync(UI, { recursive: true });
  const browser = await chromium.launch({ ...proxyOption(), args: ['--enable-unsafe-swiftshader', '--font-render-hinting=none', '--hide-scrollbars'] });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'en-US', colorScheme: 'light' });
  const page = await context.newPage();
  const shots = {};
  try {
    await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('[data-place-title]').waitFor({ state: 'visible', timeout: 90_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    // Hover nothing: the mouse parks off the page so no tab wears a hover state.
    await page.mouse.move(0, 0);

    // The tab bar with Overview active, and each tab's box relative to it.
    const dock = page.locator('[data-dock="field"]');
    const dockBox = await box(dock);
    const tabs = {};
    for (const facet of FACETS) {
      const b = await box(page.locator(`#tab-${facet}`));
      tabs[facet] = { x: b.x - dockBox.x, y: b.y - dockBox.y, width: b.width, height: b.height };
    }
    await shot(dock, 'dock-overview', shots);
    writeFileSync(join(UI, 'dock.json'), JSON.stringify({ width: dockBox.width, height: dockBox.height, tabs }, null, 2) + '\n');

    await shotUnion(page, page.locator('[data-crop-switcher] > a'), 'crops', shots);

    await page.getByRole('tab', { name: /^Water/ }).click();
    await dockFor(page, 'water', shots);
    await page.locator('[data-facet="water"]').waitFor({ state: 'visible' });
    await shot(page.locator('[data-facet="water"] > div').first(), 'water', shots);

    await page.getByRole('tab', { name: /^Heat/ }).click();
    await dockFor(page, 'heat', shots);
    await page.locator('[data-facet="heat"]').waitFor({ state: 'visible' });
    await shot(page.locator('[data-facet="heat"] > *').first(), 'heat', shots);

    await page.getByRole('tab', { name: /^Sowing/ }).click();
    await dockFor(page, 'sowing', shots);
    const dial = page.locator('section[aria-labelledby="sowing-decision"]');
    await dial.waitFor({ state: 'visible' });
    await dial.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await sleep(400);
    const dialBox = await box(dial);
    const dialHeight = Math.min(470, dialBox.height);
    await page.screenshot({ path: join(UI, 'sowing.png'), clip: { x: dialBox.x, y: dialBox.y, width: dialBox.width, height: dialHeight }, animations: 'disabled' });
    shots['sowing'] = { width: dialBox.width, height: dialHeight };
    log(`sowing.png  ${dialBox.width}×${dialHeight} css px`);

    await shot(page.locator('[data-money]'), 'money', shots);

    await page.getByRole('tab', { name: /^Replay/ }).click();
    await dockFor(page, 'replay', shots);

    await page.getByRole('tab', { name: /^Confidence/ }).click();
    await dockFor(page, 'confidence', shots);
    await page.locator('[data-facet="confidence"]').waitFor({ state: 'visible' });
    await shotUnion(page, page.locator('[data-backtest-locations] > p'), 'locations', shots, 12, true);
    // The back-test card down to its statistic block (title, ρ, p and the worst years caught, the caveat line): the
    // locations block under it is already in the strip, and without it the numbers can be shown large.
    {
      const card = page.locator('[data-backtest="national"]');
      await card.evaluate((element) => element.scrollIntoView({ block: 'center' }));
      await sleep(400);
      const cardBox = await box(card);
      const locationsBox = await box(page.locator('[data-backtest-locations]'));
      // As wide as the text above the locations block really runs (the caveat line is the longest), plus air.
      const textRight = await card.evaluate((element, limit) => {
        let right = 0;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          if ((node.textContent ?? '').trim() === '') continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) if (rect.bottom <= limit) right = Math.max(right, rect.right);
        }
        return right;
      }, locationsBox.y);
      const clip = { x: cardBox.x, y: cardBox.y, width: Math.min(cardBox.width, Math.ceil(textRight - cardBox.x + 28)), height: locationsBox.y - cardBox.y - 6 };
      await page.screenshot({ path: join(UI, 'backtest.png'), clip, animations: 'disabled' });
      shots['backtest'] = { width: clip.width, height: clip.height };
      log(`backtest.png  ${clip.width}×${clip.height} css px (statistic block)`);
    }

    // A committed demo point (Rudny district, read from disk): the data-source chips and the eight-crop table.
    await page.goto(`${BASE}/place?lat=52.9880&lon=63.1200&year=2026&name=Rudny`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.locator('[data-crop-comparison="2026"]').waitFor({ state: 'visible', timeout: 90_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.mouse.move(0, 0);
    await shot(page.locator('[data-satellite-plate="chips"]').first(), 'sources', shots);
    await shot(page.locator('[data-crop-comparison="2026"]'), 'crops-table', shots);

    writeFileSync(join(UI, 'shots.json'), JSON.stringify(shots, null, 2) + '\n');
    log('done → public/ui');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[shots] failed:', error);
  process.exit(1);
});
