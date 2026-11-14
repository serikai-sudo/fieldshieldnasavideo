/** Where a spoken word lands in the film, from public/words.json (the voice's own word timings). */
import type { Assets } from '../assets';
import { FPS } from '../script';

function normalise(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/**
 * The composition frame of a word of LINES[line] that starts with `word` — the first such word, or the last with
 * `pick: 'last'` — or `fallback` when the timings or the word are missing. `lead` frames earlier: the picture lands a
 * hair before the word, as the eye reads ahead of the ear.
 */
export function wordFrame(assets: Assets, line: number, word: string, fallback: number, lead = 2, pick: 'first' | 'last' = 'first'): number {
  const spoken = assets.words?.find((entry) => entry.line === line)?.words ?? [];
  const wanted = normalise(word);
  const hits = spoken.filter((entry) => normalise(entry.word).startsWith(wanted));
  const hit = pick === 'last' ? hits[hits.length - 1] : hits[0];
  return hit === undefined ? fallback : Math.round(hit.at * FPS) - lead;
}
