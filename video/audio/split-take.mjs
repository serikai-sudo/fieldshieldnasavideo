#!/usr/bin/env node
/**
 * Cuts one narration take into its sentences: finds the silences (ffmpeg silencedetect), keeps the N−1 longest as the
 * cut points, and writes audio/lines/<first>.wav … in order, one per sentence. Usage:
 *   node audio/split-take.mjs audio/take.mp3 8 2     # 8 sentences → lines/02.wav … lines/09.wav
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [input, countArg, firstArg] = process.argv.slice(2);
const count = Number(countArg ?? 8);
const first = Number(firstArg ?? 2);
if (!input || !Number.isInteger(count) || count < 2) {
  console.error('usage: split-take.mjs <take.mp3> <sentences> <first-line-number>');
  process.exit(1);
}
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'audio', 'lines');
mkdirSync(OUT, { recursive: true });

const detect = spawnSync('ffmpeg', ['-v', 'info', '-i', input, '-af', 'silencedetect=noise=-40dB:d=0.22', '-f', 'null', '-'], { encoding: 'utf8' });
const log = detect.stderr;
const silences = [];
for (const match of log.matchAll(/silence_start: ([0-9.]+)[\s\S]*?silence_end: ([0-9.]+)/g)) {
  silences.push({ start: Number(match[1]), end: Number(match[2]) });
}
const total = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', input], { encoding: 'utf8' }).stdout);
// Internal silences only, longest first; the N−1 longest become the cut points (at their midpoints).
const internal = silences.filter((s) => s.start > 0.15 && s.end < total - 0.15).map((s) => ({ ...s, length: s.end - s.start }));
if (internal.length < count - 1) {
  console.error(`split-take: found ${internal.length} internal pauses, need ${count - 1}. Pauses: ${internal.map((s) => `${s.start.toFixed(2)}–${s.end.toFixed(2)}`).join(', ')}`);
  process.exit(2);
}
const cuts = internal.sort((a, b) => b.length - a.length).slice(0, count - 1).map((s) => (s.start + s.end) / 2).sort((a, b) => a - b);
const bounds = [0, ...cuts, total];
for (let i = 0; i < count; i += 1) {
  const from = bounds[i];
  const to = bounds[i + 1];
  const name = `${String(first + i).padStart(2, '0')}.wav`;
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', input, '-ss', from.toFixed(3), '-to', to.toFixed(3), '-ac', '1', '-ar', '44100', join(OUT, name)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(3);
  console.log(`${name}  ${from.toFixed(2)} → ${to.toFixed(2)}  (${(to - from).toFixed(2)} s)`);
}
