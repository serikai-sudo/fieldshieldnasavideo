#!/usr/bin/env node
/**
 * Assembles public/voiceover.mp3 from the per-line takes in audio/lines/, each placed at the cue frame its LINE in
 * src/script.ts starts on — so the spoken words and the burned-in captions share one timing source. Runs with
 * `pnpm voiceover` (node --experimental-strip-types, so src/script.ts is imported as is).
 *
 * audio/lines/<NN>.mp3 — take NN (1-based, zero-padded) for LINES[NN-1]; generated once with an AI voice
 * (Higgsfield Seed Audio 1.0, preset voice Gracie) and committed, so the render never depends on the TTS service.
 *
 * Each take is trimmed of leading/trailing silence and loudness-normalised (EBU R128 −16 LUFS); a take that runs
 * longer than its window (next cue − its cue − 0.25 s) is time-stretched, pitch-preserving, by at most 8 %; internal
 * pauses longer than 0.28 s are shortened to 0.16 s first.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS, LINES, TOTAL_FRAMES } from '../src/script.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LINES_DIR = join(ROOT, 'audio', 'lines');
const WORK = join(ROOT, 'audio', 'work');
const OUT = join(ROOT, 'public', 'voiceover.mp3');
const GAP_SECONDS = 0.25;
const MAX_STRETCH = 1.08;
const TOTAL_SECONDS = TOTAL_FRAMES / FPS;

function run(args) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (result.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed`);
}

function seconds(file) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffprobe failed on ${file}`);
  return Number.parseFloat(result.stdout.trim());
}

function takeFor(index) {
  const prefix = String(index + 1).padStart(2, '0');
  const file = readdirSync(LINES_DIR).find((name) => name.startsWith(prefix) && /\.(mp3|wav|m4a)$/i.test(name));
  return file === undefined ? null : join(LINES_DIR, file);
}

mkdirSync(WORK, { recursive: true });
const inputs = [];
const report = [];
LINES.forEach((line, index) => {
  if (line.spoken === false) {
    report.push({ line: index + 1, take: 'not spoken', text: line.text });
    return;
  }
  const take = takeFor(index);
  if (take === null) {
    report.push({ line: index + 1, take: 'MISSING', text: line.text });
    return;
  }
  const cue = line.from / FPS;
  // The window runs to the next SPOKEN line: an unspoken caption in between is not a boundary for the voice.
  const next = LINES.slice(index + 1).find((candidate) => candidate.spoken !== false);
  const end = line.spokenUntil !== undefined ? line.spokenUntil / FPS : next === undefined ? TOTAL_SECONDS : next.from / FPS;
  const budget = end - cue - GAP_SECONDS;
  // 1. trim silence at both ends, shorten long internal pauses, normalise loudness, mono 44.1 kHz
  const trimmed = join(WORK, `${String(index + 1).padStart(2, '0')}-trim.wav`);
  run([
    '-i', take,
    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,silenceremove=stop_periods=-1:stop_duration=0.28:stop_threshold=-40dB:stop_silence=0.16,loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ac', '1', '-ar', '44100', trimmed,
  ]);
  let duration = seconds(trimmed);
  let stretch = 1;
  let conditioned = trimmed;
  // 2. a take longer than its window is stretched (pitch-preserving) by at most 10 %
  if (duration > budget) {
    // 1 % on top: atempo lands a few hundredths long, and the window must hold the whole take.
    stretch = Math.min(MAX_STRETCH, (duration / budget) * 1.01);
    conditioned = join(WORK, `${String(index + 1).padStart(2, '0')}-fit.wav`);
    run(['-i', trimmed, '-af', `atempo=${stretch.toFixed(4)}`, conditioned]);
    duration = seconds(conditioned);
  }
  inputs.push({ file: conditioned, delayMs: Math.round(cue * 1000) });
  report.push({ line: index + 1, cue: cue.toFixed(2), seconds: duration.toFixed(2), budget: budget.toFixed(2), stretch: stretch === 1 ? '' : `×${stretch.toFixed(3)}`, fits: duration <= budget + 0.03 ? 'ok' : 'OVER', endsAtFrame: Math.ceil((cue + duration) * FPS) });
});

if (inputs.length === 0) {
  console.error('build-voiceover: no takes in audio/lines/ — nothing to assemble.');
  process.exit(1);
}

// 3. place every take at its cue and mix into one 29.5 s track
const filter = inputs.map((input, i) => `[${i}:a]adelay=${input.delayMs}|${input.delayMs}[d${i}]`).join(';') + ';' + inputs.map((_, i) => `[d${i}]`).join('') + `amix=inputs=${inputs.length}:normalize=0:dropout_transition=0,apad[mix]`;
run([...inputs.flatMap((input) => ['-i', input.file]), '-filter_complex', filter, '-map', '[mix]', '-t', String(TOTAL_SECONDS), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '160k', OUT]);

console.table(report);
console.log(`build-voiceover: wrote public/voiceover.mp3 (${seconds(OUT).toFixed(2)} s)`);
if (report.some((row) => row.fits === 'OVER' || row.take === 'MISSING')) {
  console.error('build-voiceover: at least one line is missing or still over its window (see table).');
  process.exit(2);
}
