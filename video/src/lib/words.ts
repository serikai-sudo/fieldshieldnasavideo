/** Where a spoken word lands in the film, from public/words.json (the voice's own word timings). */
import type { Assets } from '../assets';
import { FPS } from '../script';

function normalise(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/**
 * The composition frame of the first word of LINES[line] that starts with `word`, or `fallback` when the timings or the
 * word are missing. `lead` frames earlier: the picture lands a hair before the word, as the eye reads ahead of the ear.
 */
export function wordFrame(assets: Assets, line: number, word: string, fallback: number, lead = 2): number {
  const spoken = assets.words?.find((entry) => entry.line === line)?.words;
  const hit = spoken?.find((entry) => normalise(entry.word).startsWith(word));
  return hit === undefined ? fallback : Math.round(hit.at * FPS) - lead;
}
