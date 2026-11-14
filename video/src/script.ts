/**
 * THE script: every word that appears on screen or is spoken, and every frame range, in one place.
 *
 * The film is a walkthrough of the live platform: open the map, pick a field, choose the season, then each tab of the
 * field page with one sentence on what it is for. Real screen footage throughout (public/tour.mp4, one continuous
 * recording), soft cross-fades between the steps, a calm voice.
 *
 * Rules (NASA Space Apps video, Field Shift):
 *  - 30 fps, 1920×1080, TOTAL_FRAMES = 885 (29.5 s) — hard cap; NASA disqualifies anything over 30.0 s.
 *  - No number is added by the video: the only figures on screen are the platform's own pixels; the narration names
 *    2012 only because the Replay tab replays that recorded season.
 *  - No "forecast", "predict", "flood", "real-time". English only.
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** 29.5 s. */
export const TOTAL_FRAMES = 885;

export type SceneId = 'title' | 'tour' | 'end';

export type SceneSpec = {
  readonly id: SceneId;
  /** First frame of the scene in the composition (inclusive). */
  readonly from: number;
  /** Frames the scene lasts. */
  readonly duration: number;
};

/** Title sting, the walkthrough, the end card — back to back, summing to TOTAL_FRAMES. */
export const SCENES: readonly SceneSpec[] = [
  { id: 'title', from: 0, duration: 36 },   // 0.0 – 1.2 s
  { id: 'tour', from: 36, duration: 795 },  // 1.2 – 27.7 s
  { id: 'end', from: 831, duration: 54 },   // 27.7 – 29.5 s
];

export function scene(id: SceneId): SceneSpec {
  const found = SCENES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`script: unknown scene ${id}`);
  return found;
}

/** Frames of the cross-fade between two steps of the tour (each step overlaps its neighbours by this much). */
export const TRANSITION_FRAMES = 12;

export type StepId = 'pick' | 'season' | 'overview' | 'water' | 'heat' | 'sowing' | 'replay' | 'confidence';

export type Step = {
  readonly id: StepId;
  /** The step pill: "3 · Overview". */
  readonly label: string;
  /** Frames the step's footage is on screen, including the cross-fade on each side. */
  readonly frames: number;
  /** The one sentence spoken and burned in for this step. */
  readonly text: string;
};

/**
 * The eight steps of the walkthrough, in the order they are filmed (capture/tour.mjs records the same order and writes
 * each step's start second to public/tour.json). Σ frames − 7 × TRANSITION_FRAMES = the tour scene's duration.
 */
export const STEPS: readonly Step[] = [
  { id: 'pick', label: 'Pick a field', frames: 108, text: 'Open the map and pick a field.' },
  { id: 'season', label: 'Choose the season', frames: 150, text: 'Choose the season to read.' },
  { id: 'overview', label: 'Overview', frames: 120, text: 'Overview: the verdict, the risk, the sowing date.' },
  { id: 'water', label: 'Water', frames: 96, text: 'Water: the season’s water balance.' },
  { id: 'heat', label: 'Heat', frames: 96, text: 'Heat: heat and drought at flowering.' },
  { id: 'sowing', label: 'Sowing', frames: 108, text: 'Sowing: the steadiest date, and its price.' },
  { id: 'replay', label: 'Replay', frames: 105, text: 'Replay: the 2012 season, day by day.' },
  { id: 'confidence', label: 'Confidence', frames: 96, text: 'Confidence: the record, the trend, the back-test.' },
];

/** The composition frame on which step `index` begins (the first frame of its fade-in). */
export function stepStart(index: number): number {
  let frame = scene('tour').from;
  for (let i = 0; i < index; i += 1) {
    const step = STEPS[i];
    if (step === undefined) throw new Error(`script: no step ${i}`);
    frame += step.frames - TRANSITION_FRAMES;
  }
  return frame;
}

/* ------------------------------------------------------------------------------------------------ on-screen text */

export const TEXT = {
  title: 'Field Shift',
  url: 'shield-field.vercel.app',
  /** What a step shows while public/tour.mp4 is missing. */
  placeholder: 'LIVE PLATFORM · walkthrough footage',
} as const;

/* ------------------------------------------------------------------------------------------ voice-over + captions */

export type Line = {
  /** First frame the caption is on screen. */
  readonly from: number;
  /** Last frame (exclusive). */
  readonly to: number;
  /** Spoken and burned in as the subtitle; keep to two lines at 34 px over ~1200 px. */
  readonly text: string;
  /** false: a caption only; the voice pauses there. */
  readonly spoken?: boolean;
  /** The frame the spoken take must end by, when earlier than the next spoken cue. */
  readonly spokenUntil?: number;
};

/** A step's sentence starts a few frames into its segment, once the cross-fade has settled. */
const CUE_OFFSET = 8;

/**
 * The voice-over, line by line, with the frames its subtitle is on screen (seconds = frame / 30): the title sting, then
 * one sentence per step. The spoken takes live in audio/lines/<NN>.mp3|wav (01 = the title, 02…09 = the steps, cut
 * from one calm take by audio/split-take.mjs); `pnpm voiceover` places each at its `from` cue. The `to` frames follow
 * the measured takes, clamped to the next cue.
 */
export const LINES: readonly Line[] = [
  { from: 4, to: 34, text: 'Field Shift.' },
  ...STEPS.map((step, index) => ({
    from: stepStart(index) + CUE_OFFSET,
    to: (index + 1 < STEPS.length ? stepStart(index + 1) : scene('end').from) + CUE_OFFSET - 4,
    text: step.text,
  })),
];

/** The caption on screen at a composition frame, if any. */
export function lineAt(frame: number): Line | undefined {
  return LINES.find((line) => frame >= line.from && frame < line.to);
}

/* -------------------------------------------------------------------------------------------------- consistency */

const scenesTotal = SCENES.reduce((sum, item) => sum + item.duration, 0);
if (scenesTotal !== TOTAL_FRAMES) throw new Error(`script: scenes sum to ${scenesTotal}, expected ${TOTAL_FRAMES}`);
SCENES.forEach((item, index) => {
  const previous = SCENES[index - 1];
  const expected = previous === undefined ? 0 : previous.from + previous.duration;
  if (item.from !== expected) throw new Error(`script: scene ${item.id} starts at ${item.from}, expected ${expected}`);
});
const tourVisible = STEPS.reduce((sum, step) => sum + step.frames, 0) - (STEPS.length - 1) * TRANSITION_FRAMES;
if (tourVisible !== scene('tour').duration) throw new Error(`script: the steps show ${tourVisible} frames, the tour scene lasts ${scene('tour').duration}`);
LINES.forEach((line, index) => {
  const previous = LINES[index - 1];
  if (line.to <= line.from) throw new Error(`script: line ${index} has no duration`);
  if (previous !== undefined && line.from < previous.to) throw new Error(`script: line ${index} overlaps the previous one`);
  if (line.to > TOTAL_FRAMES) throw new Error(`script: line ${index} runs past the end`);
});
