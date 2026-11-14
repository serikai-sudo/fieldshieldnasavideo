#!/usr/bin/env node
/**
 * Speaks every line of src/script.ts LINES with the free Microsoft neural voice (edge-tts, via audio/tts_line.py) into
 * audio/lines/<NN>.mp3 and <NN>.mp3.words.json (each word's start). Needs Python 3 with edge-tts
 * (`python3 -m pip install --user edge-tts`) and network access to speech.platform.bing.com; HTTPS_PROXY is honoured.
 *   TTS_VOICE (default en-US-JennyNeural) · TTS_RATE (default +0%: the natural pace; negative is slower)
 * Then `pnpm voiceover` assembles public/voiceover.mp3 and public/words.json from the takes.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LINES } from '../src/script.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LINES_DIR = join(ROOT, 'audio', 'lines');
const VOICE = process.env.TTS_VOICE ?? 'en-US-JennyNeural';
const RATE = process.env.TTS_RATE ?? '+0%';

mkdirSync(LINES_DIR, { recursive: true });
for (const name of readdirSync(LINES_DIR)) rmSync(join(LINES_DIR, name));
LINES.forEach((line, index) => {
  if (line.spoken === false) return;
  const out = join(LINES_DIR, `${String(index + 1).padStart(2, '0')}.mp3`);
  const result = spawnSync('python3', [join(ROOT, 'audio', 'tts_line.py'), '--voice', VOICE, `--rate=${RATE}`, '--text', line.text, '--out', out], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`tts: line ${index + 1} failed`);
    process.exit(1);
  }
  console.log(`tts: ${String(index + 1).padStart(2, '0')}.mp3  ${line.text}`);
});
console.log(`tts: ${VOICE} at ${RATE}`);
