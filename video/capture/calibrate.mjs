#!/usr/bin/env node
/**
 * Playwright's recording does not start at a fixed moment after the page is created, so the event seconds logged by
 * capture/tour.mjs can be off by up to half a second in the encoded clip. This finds, in the pixels, the frame where a
 * known event really shows — the field page's content changing when a tab is clicked — and shifts all of that clip's
 * events by the difference. Run by tour.mjs after encoding; standalone (`node capture/calibrate.mjs`) it re-calibrates
 * public/clips.json in place from the raw events it keeps.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
/** Below the tab bar on the field page (output pixels): it changes the moment a tab's content swaps. */
const CONTENT_BOX = { x: 120, y: 700, w: 780, h: 200 };
/**
 * Which event each clip is calibrated on: a change that is unmistakable in the pixels — a tab's content swapping, or
 * the calculator's money turning into tenge (inside the clip's own `calibrationBox`).
 */
const ANCHORS = { magic: 'sowingReady', replay: 'replayReady', money: 'kztShown' };
const MAX_SHIFT = 1.5;

/** First second in [from, to] at which the box differs clearly from its look at `from`; null when it never does. */
export function firstChange(file, from, to, box = CONTENT_BOX) {
  const scale = 4;
  const w = Math.floor(box.w / scale);
  const h = Math.floor(box.h / scale);
  const result = spawnSync('ffmpeg', ['-v', 'error', '-ss', Math.max(0, from).toFixed(3), '-i', file, '-t', (to - from).toFixed(3), '-vf', `fps=30,crop=${box.w}:${box.h}:${box.x}:${box.y},scale=${w}:${h},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  if (result.status !== 0) return null;
  const size = w * h;
  const frames = Math.floor(result.stdout.length / size);
  const base = result.stdout.subarray(0, size);
  for (let i = 1; i < frames; i += 1) {
    const frame = result.stdout.subarray(i * size, (i + 1) * size);
    let sum = 0;
    for (let k = 0; k < size; k += 1) sum += Math.abs(frame[k] - base[k]);
    if (sum / size > 6) return Math.max(0, from) + i / 30;
  }
  return null;
}

function shift(event, by) {
  if (typeof event === 'number') return Number((event + by).toFixed(3));
  return { ...event, sec: Number((event.sec + by).toFixed(3)) };
}

/** Calibrates one clip entry of clips.json in place; returns the applied offset (seconds) or null. */
export function calibrateClip(entry, file, anchor) {
  const raw = entry.rawEvents ?? entry.events;
  if (raw === undefined || raw[anchor] === undefined) return null;
  const logged = typeof raw[anchor] === 'number' ? raw[anchor] : raw[anchor].sec;
  const seen = firstChange(file, logged - 1.2, logged + 0.8, entry.calibrationBox ?? CONTENT_BOX);
  if (seen === null) return null;
  const offset = Number((seen - logged).toFixed(3));
  if (Math.abs(offset) > MAX_SHIFT) return null;
  entry.rawEvents = raw;
  entry.events = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, shift(value, offset)]));
  entry.calibration = { anchor, offsetSeconds: offset };
  return offset;
}

export function calibrateAll(clips) {
  const report = {};
  for (const [key, anchor] of Object.entries(ANCHORS)) {
    if (clips[key] === undefined) continue;
    report[key] = calibrateClip(clips[key], join(PUBLIC, clips[key].file), anchor);
  }
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = join(PUBLIC, 'clips.json');
  const clips = JSON.parse(readFileSync(path, 'utf8'));
  const report = calibrateAll(clips);
  writeFileSync(path, JSON.stringify(clips, null, 2) + '\n');
  console.log('[calibrate]', JSON.stringify(report));
}
