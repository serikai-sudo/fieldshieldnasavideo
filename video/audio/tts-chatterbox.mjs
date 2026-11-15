#!/usr/bin/env node
/**
 * Speaks every line of src/script.ts LINES with Chatterbox (Resemble AI, MIT; its built-in voice, run locally on the
 * CPU) via audio/tts_chatterbox.py, into audio/lines/<NN>.mp3 + <NN>.mp3.words.json — the same files the edge-tts path
 * (audio/tts.mjs) writes, so `pnpm voiceover` needs no change. This script only hands the lines over: the text as it
 * reads on screen, the text as it is to be said (SAY substitutions), where the `*…*` emphasis spans sit, and how long
 * each line may run (its window, so the Python side can pick the take that fits).
 *   needs audio/.venv (uv venv audio/.venv --python 3.13 && uv pip install chatterbox-tts soundfile)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FPS, LINES, SAY, TOTAL_FRAMES, plainText, segmentsOf } from '../src/script.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PYTHON = join(ROOT, 'audio', '.venv', 'bin', 'python');
const WORK = join(ROOT, 'audio', 'work');
const GAP_SECONDS = 0.06;
const MAX_STRETCH = 1.085;

if (!existsSync(PYTHON)) {
  console.error('tts-chatterbox: audio/.venv is missing — uv venv audio/.venv --python 3.13 && uv pip install chatterbox-tts soundfile');
  process.exit(1);
}
mkdirSync(WORK, { recursive: true });
const jobs = [];
LINES.forEach((line, index) => {
  if (line.spoken === false) return;
  const next = LINES.slice(index + 1).find((candidate) => candidate.spoken !== false);
  const end = line.spokenUntil ?? next?.from ?? TOTAL_FRAMES;
  const windowSeconds = (end - line.from) / FPS - GAP_SECONDS;
  jobs.push({
    index,
    id: String(index + 1).padStart(2, '0'),
    text: plainText(line.text),
    segments: segmentsOf(line.text),
    /** The take may run this long and still fit after the allowed stretch. */
    maxSeconds: Number((windowSeconds * MAX_STRETCH).toFixed(3)),
  });
});
const spec = join(WORK, 'chatterbox-lines.json');
writeFileSync(spec, JSON.stringify({ say: SAY, lines: jobs, only: (process.env.TTS_ONLY ?? '').split(',').filter(Boolean).map(Number) }, null, 1));
const result = spawnSync(PYTHON, [join(ROOT, 'audio', 'tts_chatterbox.py'), spec], { stdio: 'inherit', env: { ...process.env, HF_HOME: join(ROOT, 'audio', '.hf'), TOKENIZERS_PARALLELISM: 'false' } });
process.exit(result.status ?? 1);
