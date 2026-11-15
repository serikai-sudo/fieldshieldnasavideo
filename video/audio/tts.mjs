#!/usr/bin/env node
/**
 * Speaks every line of src/script.ts LINES with the free Microsoft neural voice (edge-tts, via audio/tts_line.py) into
 * audio/lines/<NN>.mp3 and <NN>.mp3.words.json (each word's start). Needs Python 3 with edge-tts
 * (`python3 -m pip install --user edge-tts`) and network access to speech.platform.bing.com; HTTPS_PROXY is honoured.
 *
 * A line is spoken in segments: the parts between `*…*` are the moments meant to land with the jury, delivered higher,
 * louder and a touch slower (EMPHASIS); the rest at the voice's natural pace (PLAIN, or the line's own base tone). A
 * segment that does not end the line is synthesised with a trailing comma, so its intonation stays open instead of
 * falling as at a full stop. Each segment is trimmed of edge silence; they are joined with a short beat before the
 * emphasis, and every word's start is shifted by where its segment landed.
 *   TTS_VOICE (default en-US-AvaMultilingualNeural) · TTS_RATE (default +5%: Ava's natural pace, a hair brisker)
 * Then `pnpm voiceover` assembles public/voiceover.mp3 and public/words.json from the takes.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINES, LINE_TONE, SAY, segmentsOf } from '../src/script.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LINES_DIR = join(ROOT, 'audio', 'lines');
const WORK = join(ROOT, 'audio', 'work', 'segments');
export const VOICE = process.env.TTS_VOICE ?? 'en-US-AvaMultilingualNeural';
const RATE = process.env.TTS_RATE ?? '+5%';
const PLAIN = { pitch: '+0Hz', volume: '+0%', rate: RATE, gainDb: 0 };
/** The lifted delivery of a key phrase: higher, louder (TTS prosody plus a post gain), a touch slower. */
const EMPHASIS = { pitch: '+12Hz', volume: '+20%', rate: '+0%', gainDb: 2.5 };
/** Silence between segments: a short beat before the emphasis, as a speaker leaves before the line that matters. */
const BEAT_SECONDS = 0.08;
const KEEP_EDGE = 0.02;

function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (result.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed`);
}

function seconds(file) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  return Number.parseFloat(result.stdout.trim());
}

/** Seconds of silence at the start of a file (−45 dB). */
function leadSilence(file) {
  const result = spawnSync('ffmpeg', ['-v', 'info', '-i', file, '-af', 'silencedetect=noise=-45dB:d=0.02', '-f', 'null', '-'], { encoding: 'utf8' });
  const start = /silence_start: (-?[0-9.]+)/.exec(result.stderr);
  const end = /silence_end: ([0-9.]+)/.exec(result.stderr);
  if (start === null || end === null || Number(start[1]) > 0.01) return 0;
  return Number(end[1]);
}

/** One segment; retried when the service returns a cut-off stream (less audio than its own word timings span). */
function speak(text, tone, out) {
  const args = [join(ROOT, 'audio', 'tts_line.py'), '--voice', VOICE, `--rate=${tone.rate}`, `--pitch=${tone.pitch}`, `--volume=${tone.volume}`, '--text', text, '--out', out];
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const result = spawnSync('python3', args, { stdio: 'inherit' });
    if (result.status === 0) {
      const words = JSON.parse(readFileSync(`${out}.words.json`, 'utf8'));
      const spokenUntil = words.length === 0 ? 0 : words[words.length - 1].end;
      if (words.length > 0 && seconds(out) >= spokenUntil) return;
    }
    console.warn(`tts: retry ${attempt} — incomplete audio for "${text}"`);
  }
  throw new Error(`tts failed: ${text}`);
}

mkdirSync(LINES_DIR, { recursive: true });
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
/** TTS_ONLY=0,3 re-speaks just those lines (0-based) and keeps the other takes. */
const only = (process.env.TTS_ONLY ?? '').split(',').filter(Boolean).map(Number);
if (only.length === 0) for (const name of readdirSync(LINES_DIR)) rmSync(join(LINES_DIR, name));

LINES.forEach((line, index) => {
  if (line.spoken === false || (only.length > 0 && !only.includes(index))) return;
  const id = String(index + 1).padStart(2, '0');
  const segments = segmentsOf(line.text);
  const base = { ...PLAIN, pitch: LINE_TONE[index] ?? PLAIN.pitch };
  const parts = [];
  const words = [];
  let offset = 0;
  segments.forEach((segment, k) => {
    const tone = segment.emphasis ? EMPHASIS : base;
    const last = k === segments.length - 1;
    // An open segment keeps its intonation up: a comma instead of the end of a sentence.
    const open = last || /[,:;—?!]$/.test(segment.text) ? segment.text : `${segment.text.replace(/[.]$/, '')},`;
    const spoken = Object.entries(SAY).reduce((text, [written, said]) => text.split(written).join(said), open);
    const raw = join(WORK, `${id}-${k}.mp3`);
    speak(spoken, tone, raw);
    const removed = Math.max(0, leadSilence(raw) - KEEP_EDGE);
    const trimmed = join(WORK, `${id}-${k}.wav`);
    ffmpeg([
      '-i', raw,
      '-af', `silenceremove=start_periods=1:start_threshold=-45dB:start_silence=${KEEP_EDGE},areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04,areverse,volume=${tone.gainDb}dB`,
      '-ac', '1', '-ar', '44100', trimmed,
    ]);
    if (k > 0) offset += BEAT_SECONDS;
    const spokenWords = JSON.parse(readFileSync(`${raw}.words.json`, 'utf8')).map((word) => ({ word: word.word, start: Number((offset + Math.max(0, word.start - removed)).toFixed(3)), end: Number((offset + Math.max(0, word.end - removed)).toFixed(3)) }));
    // A written token said as several words ("Alga Mura") folds back into one entry under its written form.
    for (let i = 0; i < spokenWords.length; i += 1) {
      const hit = Object.entries(SAY).find(([, said]) => {
        const parts = said.split(/[\s-]+/);
        return parts.every((part, k) => spokenWords[i + k]?.word.toLowerCase().replace(/[^a-z0-9]/g, '') === part.toLowerCase());
      });
      if (hit === undefined) {
        const single = Object.entries(SAY).find(([, said]) => spokenWords[i].word.toLowerCase().startsWith(said.split(/[\s-]+/)[0].toLowerCase()))?.[0];
        words.push({ ...spokenWords[i], word: single ?? spokenWords[i].word });
        continue;
      }
      const count = hit[1].split(/[\s-]+/).length;
      words.push({ word: hit[0], start: spokenWords[i].start, end: spokenWords[i + count - 1].end });
      i += count - 1;
    }
    parts.push(trimmed);
    offset += seconds(trimmed);
  });
  // Join: segment, beat, segment … into one take.
  const out = join(LINES_DIR, `${id}.mp3`);
  const inputs = parts.flatMap((part) => ['-i', part]);
  const beat = `aevalsrc=0:d=${BEAT_SECONDS}:s=44100`;
  const chain = parts.map((_, i) => (i === 0 ? `[${i}:a]` : `[b${i}][${i}:a]`)).join('');
  const beats = parts.slice(1).map((_, i) => `${beat}[b${i + 1}]`).join(';');
  const filter = `${beats ? `${beats};` : ''}${chain}concat=n=${parts.length * 2 - 1}:v=0:a=1[out]`;
  ffmpeg([...inputs, '-filter_complex', filter, '-map', '[out]', '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '192k', out]);
  writeFileSync(`${out}.words.json`, JSON.stringify(words, null, 1) + '\n');
  console.log(`tts: ${id}.mp3  ${seconds(out).toFixed(2)} s  ${line.text}`);
});
console.log(`tts: ${VOICE} at ${RATE}; emphasis ${EMPHASIS.pitch} / ${EMPHASIS.volume} / ${EMPHASIS.rate} / +${EMPHASIS.gainDb} dB`);
