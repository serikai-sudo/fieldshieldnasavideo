/**
 * Which optional assets exist in public/ — probed once per composition load (calculateMetadata), so Studio and the
 * renderer work before the clips, screenshots and voice-over exist, and pick them up by filename the moment they do.
 */
import { staticFile } from 'remotion';

/**
 * A logged moment of a recording: seconds into the clip, or a moment at a point of the 1920×1080 frame (a click, or the
 * centre of an element with its width and height).
 */
export type ClipEvent = number | { readonly sec: number; readonly x: number; readonly y: number; readonly w?: number; readonly h?: number };

export type ClipInfo = {
  readonly exists: boolean;
  /** Duration in seconds from public/clips.json (written by capture/tour.mjs); null when unknown. */
  readonly seconds: number | null;
  /** The recording's events (map ready, clicks, tabs ready …) in clip seconds; empty when unknown. */
  readonly events: Readonly<Record<string, ClipEvent>>;
};

export function eventSec(event: ClipEvent | undefined): number | null {
  if (event === undefined) return null;
  return typeof event === 'number' ? event : event.sec;
}

export type Box = { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
export type Size = { readonly width: number; readonly height: number };

/** The real field-page pictures of the strip scene (capture/ui-shots.mjs); null while public/ui/ is missing. */
export type UiAssets = {
  /** The tab bar's CSS size and each tab's box inside it. */
  readonly dock: Size & { readonly tabs: Readonly<Record<string, Box>> };
  /** Each picture's CSS size (the PNGs are twice as large: device scale 2). */
  readonly shots: Readonly<Record<string, Size>>;
} | null;

/** Every spoken word's onset in composition seconds, per line (public/words.json, written by pnpm voiceover). */
export type WordTimings = readonly { readonly line: number; readonly words: readonly { readonly word: string; readonly at: number }[] }[] | null;

export type Assets = {
  readonly magic: ClipInfo;
  readonly replay: ClipInfo;
  readonly money: ClipInfo;
  readonly voiceover: boolean;
  readonly ui: UiAssets;
  readonly words: WordTimings;
};

export const CLIP_FILES = { magic: 'clip-magic.mp4', replay: 'clip-replay.mp4', money: 'clip-money.mp4' } as const;
export const VOICEOVER_FILE = 'voiceover.mp3';
export const CLIPS_JSON = 'clips.json';

export const NO_ASSETS: Assets = {
  magic: { exists: false, seconds: null, events: {} },
  replay: { exists: false, seconds: null, events: {} },
  money: { exists: false, seconds: null, events: {} },
  voiceover: false,
  ui: null,
  words: null,
};

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

type ClipsJson = Partial<Record<keyof typeof CLIP_FILES, { readonly seconds?: number; readonly events?: Readonly<Record<string, ClipEvent>> }>>;

async function readClipsJson(): Promise<ClipsJson> {
  try {
    const response = await fetch(staticFile(CLIPS_JSON), { cache: 'no-store' });
    if (!response.ok) return {};
    const type = response.headers.get('content-type') ?? '';
    if (type.includes('text/html')) return {};
    const parsed: unknown = await response.json();
    return typeof parsed === 'object' && parsed !== null ? (parsed as ClipsJson) : {};
  } catch {
    return {};
  }
}

/** A JSON file from public/, or null when it is missing or not JSON. */
async function readJson(name: string): Promise<unknown> {
  try {
    const response = await fetch(staticFile(name), { cache: 'no-store' });
    if (!response.ok) return null;
    if ((response.headers.get('content-type') ?? '').includes('text/html')) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

async function readUi(): Promise<UiAssets> {
  const [dock, shots] = await Promise.all([readJson('ui/dock.json'), readJson('ui/shots.json')]);
  if (!isRecord(dock) || !isRecord(shots) || !isRecord(dock['tabs'])) return null;
  if (typeof dock['width'] !== 'number' || typeof dock['height'] !== 'number') return null;
  return { dock: dock as unknown as NonNullable<UiAssets>['dock'], shots: shots as unknown as NonNullable<UiAssets>['shots'] };
}

async function readWords(): Promise<WordTimings> {
  const parsed = await readJson('words.json');
  if (!isRecord(parsed) || !Array.isArray(parsed['lines'])) return null;
  return parsed['lines'] as unknown as WordTimings;
}

export async function probeAssets(): Promise<Assets> {
  const [magic, replay, money, voiceover, clips, ui, words] = await Promise.all([
    fileExists(CLIP_FILES.magic),
    fileExists(CLIP_FILES.replay),
    fileExists(CLIP_FILES.money),
    fileExists(VOICEOVER_FILE),
    readClipsJson(),
    readUi(),
    readWords(),
  ]);
  const seconds = (key: keyof typeof CLIP_FILES): number | null => {
    const value = clips[key]?.seconds;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  };
  return {
    magic: { exists: magic, seconds: seconds('magic'), events: clips.magic?.events ?? {} },
    replay: { exists: replay, seconds: seconds('replay'), events: clips.replay?.events ?? {} },
    money: { exists: money, seconds: seconds('money'), events: clips.money?.events ?? {} },
    voiceover,
    ui,
    words,
  };
}
