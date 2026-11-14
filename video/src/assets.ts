/**
 * Which optional assets exist in public/ — probed once per composition load (calculateMetadata), so Studio and the
 * renderer work before the footage and the voice-over exist, and pick them up by filename the moment they do.
 */
import { staticFile } from 'remotion';
import { STEPS } from './script';

export type TourClick = { readonly sec: number; readonly x: number; readonly y: number };
export type TourStep = { readonly id: string; readonly startSec: number; readonly click: TourClick | null };

export type Assets = {
  readonly tour: {
    readonly exists: boolean;
    /** Duration of tour.mp4 in seconds, from tour.json; null when unknown. */
    readonly seconds: number | null;
    /** One entry per step of script.ts STEPS, in order; null when tour.json is missing or does not match. */
    readonly steps: readonly TourStep[] | null;
  };
  readonly voiceover: boolean;
};

export const TOUR_FILE = 'tour.mp4';
export const TOUR_JSON = 'tour.json';
export const VOICEOVER_FILE = 'voiceover.mp3';

export const NO_ASSETS: Assets = { tour: { exists: false, seconds: null, steps: null }, voiceover: false };

/** True when the static server answers with the file itself (not a 404, not an index.html fallback). */
async function fileExists(name: string): Promise<boolean> {
  try {
    const response = await fetch(staticFile(name), { method: 'HEAD', cache: 'no-store' });
    if (!response.ok) return false;
    const type = response.headers.get('content-type') ?? '';
    return !type.includes('text/html');
  } catch {
    return false;
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function finite(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

/** Reads public/tour.json; the steps are accepted only when they are the script's steps, in order. */
async function readTourJson(): Promise<{ seconds: number | null; steps: readonly TourStep[] | null }> {
  try {
    const response = await fetch(staticFile(TOUR_JSON), { cache: 'no-store' });
    if (!response.ok) return { seconds: null, steps: null };
    const type = response.headers.get('content-type') ?? '';
    if (type.includes('text/html')) return { seconds: null, steps: null };
    const parsed: unknown = await response.json();
    if (!isRecord(parsed)) return { seconds: null, steps: null };
    const seconds = finite(parsed['seconds']);
    const raw = parsed['steps'];
    if (!Array.isArray(raw) || raw.length !== STEPS.length) return { seconds, steps: null };
    const steps: TourStep[] = [];
    for (const [index, entry] of raw.entries()) {
      if (!isRecord(entry) || entry['id'] !== STEPS[index]?.id) return { seconds, steps: null };
      const startSec = finite(entry['startSec']);
      if (startSec === null) return { seconds, steps: null };
      const click = entry['click'];
      const sec = isRecord(click) ? finite(click['sec']) : null;
      const x = isRecord(click) ? finite(click['x']) : null;
      const y = isRecord(click) ? finite(click['y']) : null;
      steps.push({ id: String(entry['id']), startSec, click: sec !== null && x !== null && y !== null ? { sec, x, y } : null });
    }
    return { seconds, steps };
  } catch {
    return { seconds: null, steps: null };
  }
}

export async function probeAssets(): Promise<Assets> {
  const [tourExists, voiceover, tour] = await Promise.all([fileExists(TOUR_FILE), fileExists(VOICEOVER_FILE), readTourJson()]);
  return { tour: { exists: tourExists, seconds: tour.seconds, steps: tourExists ? tour.steps : null }, voiceover };
}
