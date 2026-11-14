/**
 * Which optional assets exist in public/ — probed once per composition load (calculateMetadata), so Studio and the
 * renderer work before the clips, screenshots and voice-over exist, and pick them up by filename the moment they do.
 */
import { staticFile } from 'remotion';
import { TEXT } from './script';

export type ClipInfo = {
  readonly exists: boolean;
  /** Duration in seconds from public/clips.json (written by capture/tour.mjs); null when unknown. */
  readonly seconds: number | null;
};

export type Assets = {
  readonly magic: ClipInfo;
  readonly replay: ClipInfo;
  readonly voiceover: boolean;
  /** Keyed by file name (TEXT.validation.strip[].file). */
  readonly shots: Readonly<Record<string, boolean>>;
};

export const CLIP_FILES = { magic: 'clip-magic.mp4', replay: 'clip-replay.mp4' } as const;
export const VOICEOVER_FILE = 'voiceover.mp3';
export const CLIPS_JSON = 'clips.json';

export const NO_ASSETS: Assets = {
  magic: { exists: false, seconds: null },
  replay: { exists: false, seconds: null },
  voiceover: false,
  shots: Object.fromEntries(TEXT.validation.strip.map((shot) => [shot.file, false])),
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

type ClipsJson = Partial<Record<keyof typeof CLIP_FILES, { readonly seconds?: number }>>;

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

export async function probeAssets(): Promise<Assets> {
  const [magic, replay, voiceover, clips, ...shots] = await Promise.all([
    fileExists(CLIP_FILES.magic),
    fileExists(CLIP_FILES.replay),
    fileExists(VOICEOVER_FILE),
    readClipsJson(),
    ...TEXT.validation.strip.map((shot) => fileExists(shot.file)),
  ]);
  const seconds = (key: keyof typeof CLIP_FILES): number | null => {
    const value = clips[key]?.seconds;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
  };
  return {
    magic: { exists: magic, seconds: seconds('magic') },
    replay: { exists: replay, seconds: seconds('replay') },
    voiceover,
    shots: Object.fromEntries(TEXT.validation.strip.map((shot, index) => [shot.file, shots[index] ?? false])),
  };
}

/**
 * The playback rate that fits a clip into its slot: 1× when it already fits, faster up to 1.5× when it is longer.
 * A clip that is still too long is simply cut by the slot (it ends on a held frame anyway).
 */
export function rateFor(clip: ClipInfo, slotSeconds: number): number {
  if (clip.seconds === null) return 1;
  const needed = clip.seconds / slotSeconds;
  return Math.min(1.5, Math.max(1, Math.round(needed * 100) / 100));
}
