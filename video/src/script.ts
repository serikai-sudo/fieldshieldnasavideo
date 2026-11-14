/**
 * THE script: every word that appears on screen or is spoken, and every frame range, in one place.
 *
 * Rules (NASA Space Apps video, Field Shift):
 *  - 30 fps, 1920×1080, TOTAL_FRAMES = 885 (29.5 s) — hard cap; NASA disqualifies anything over 30.0 s.
 *  - Numbers added by the video, each with its source: 16.61 and 7.93 c/ha (national wheat yield 2011 / 2012, FAOSTAT,
 *    the app's data/yields-national-kz.json); May 28 (data/snapshots/sowing/kostanay-01.json cvarOptimal 05-28); 40
 *    years (the app's 1984–2023 reference record); 55 days (the app's own 2012 replay line); 33 years, ρ −0.63,
 *    p < 0.001 (data/skill-national.json); ρ −0.66 leave-one-out for water + heat, and which years each signal flags
 *    (data/skill-heat.json, the app repository at 8e5fa1b — not yet on the live site, so the scene says where it is
 *    from). Every other figure on screen is a pixel of the platform itself.
 *  - The water signal alone misses 2012; the replay and the heat line are what catch it — said as such.
 *  - No "forecast", "predict", "flood", "real-time". English only.
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** 29.5 s. */
export const TOTAL_FRAMES = 885;

export type SceneId = 'intro' | 'problem' | 'demoA' | 'demoB' | 'money' | 'hazards' | 'replay' | 'backtest' | 'close';

export type SceneSpec = {
  readonly id: SceneId;
  /** First frame of the scene in the composition (inclusive). */
  readonly from: number;
  /** Frames the scene lasts. */
  readonly duration: number;
};

/** The scenes, back to back, summing to TOTAL_FRAMES. Each scene carries one voice line and shows what it says. */
export const SCENES: readonly SceneSpec[] = [
  { id: 'intro', from: 0, duration: 81 },       // 0.0 – 2.7 s   "Hi, I'm Ayaru, from team Innovator."
  { id: 'problem', from: 81, duration: 81 },    // 2.7 – 5.4 s   the 2012 harvest
  { id: 'demoA', from: 162, duration: 105 },    // 5.4 – 8.9 s   one click: risk, sowing date, confidence
  { id: 'demoB', from: 267, duration: 107 },    // 8.9 – 12.5 s  the sowing date (CVaR)
  { id: 'money', from: 374, duration: 102 },    // 12.5 – 15.9 s the price of timing, in tenge
  { id: 'hazards', from: 476, duration: 93 },   // 15.9 – 19.0 s water balance + heat at flowering
  { id: 'replay', from: 569, duration: 113 },   // 19.0 – 22.7 s the 2012 replay
  { id: 'backtest', from: 682, duration: 120 }, // 22.7 – 26.7 s 33 years back-tested, leave-one-out
  { id: 'close', from: 802, duration: 83 },     // 26.7 – 29.5 s every rainfed grain belt on Earth
];

export function scene(id: SceneId): SceneSpec {
  const found = SCENES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`script: unknown scene ${id}`);
  return found;
}

export type ClipCut = {
  readonly clip: 'magic' | 'replay' | 'money';
  /** The event of public/clips.json the cut is anchored on, and the seconds shown before it. */
  readonly anchor: string;
  readonly lead: number;
  /** Clicks marked with a brick-red ring. */
  readonly rings: readonly string[];
  /** The event the camera punches in towards; null for a slow push only. */
  readonly punch: string | null;
  /** A sentence event (with a width) underlined in brick red when it appears. */
  readonly underline?: string;
  /** A fixed framing of the recording: scaled by `scale` around the point (x, y) of the 1920×1080 frame. */
  readonly view?: { readonly scale: number; readonly x: number; readonly y: number };
};

/** Where each clip scene cuts its recording (events logged by capture/tour.mjs, calibrated against the pixels). */
export const CLIP_CUTS = {
  demoA: { clip: 'magic', anchor: 'nodeClick', lead: 1.2, rings: ['nodeClick'], punch: 'nodeClick' },
  demoB: { clip: 'magic', anchor: 'sowingReady', lead: 0.15, rings: [], punch: null },
  // The calculator fills the left of the frame (slider at the top, the "gives up" sentence above the captions).
  money: { clip: 'money', anchor: 'kztClick', lead: 0.4, rings: ['kztClick'], punch: 'givesUp', underline: 'givesUp', view: { scale: 1.4, x: 639, y: 110 } },
  replay: { clip: 'replay', anchor: 'replayClick', lead: 0.4, rings: ['replayClick'], punch: 'replayClick' },
} as const satisfies Readonly<Record<string, ClipCut>>;

/** A label that pops onto a scene when the voice says `word` (line `line`). */
export type Tag = { readonly line: number; readonly word: string; readonly label: string; readonly sub?: string };

/* ------------------------------------------------------------------------------------------------ on-screen text */

export const TEXT = {
  intro: { hi: 'Hi, I’m', name: 'Ayaru', team: 'team Innovator' },
  problem: {
    label: '2012 drought — national wheat yield fell by about half',
    /** The part of the label set in the accent colour. */
    accent: 'fell by about half',
    unit: 'c/ha',
    source: 'FAOSTAT',
    bars: [
      { year: '2011', value: 16.61 },
      { year: '2012', value: 7.93 },
    ],
    region: 'Northern Kazakhstan · spring-wheat belt',
  },
  demoA: {
    placeholder: 'LIVE PLATFORM: the map → Kostanay → the season in one panel',
    /** What one click gives, each tag on its spoken word. */
    tags: [
      { line: 2, word: 'risk', label: 'Risk', sub: 'Kostanay 2026 · high caution' },
      { line: 2, word: 'sowing', label: 'Sowing date', sub: 'one date, from 40 years of weather' },
      { line: 2, word: 'confidence', label: 'Confidence', sub: 'how sure, and why' },
    ] satisfies readonly Tag[],
  },
  demoB: {
    highlight: 'Sow around May 28',
    placeholder: 'LIVE PLATFORM: the Sowing tab → around May 28',
    tags: [{ line: 3, word: 'worst', label: 'CVaR', sub: 'best in the worst fifth of 40 years' }] satisfies readonly Tag[],
  },
  money: {
    placeholder: 'LIVE PLATFORM: the price of timing → in tenge',
    tags: [
      { line: 4, word: 'calculator', label: 'The price of timing', sub: 'area × revenue × dry-year share' },
      { line: 4, word: 'tenge', label: 'USD or ₸', sub: 'at the National Bank rate' },
    ] satisfies readonly Tag[],
  },
  hazards: {
    title: 'Two hazards, scored together',
    reveals: [
      { word: 'water', tab: 'water', shot: 'water' },
      { word: 'heat', tab: 'heat', shot: 'heat' },
    ],
  },
  replay: {
    placeholder: 'LIVE PLATFORM: Replay 2012 → High caution before harvest',
    tags: [{ line: 6, word: 'caution', label: 'High caution', sub: 'Jul 18 · 55 days before harvest' }] satisfies readonly Tag[],
  },
  backtest: {
    eyebrow: 'Confidence · back-test',
    /** Shown instead while public/ui/backtest.png is missing. */
    fallback: 'back-tested 1992–2024 · Spearman ρ = −0.63 · p < 0.001',
    rows: [
      { word: 'back', label: 'Water alone', value: 'ρ −0.63', note: 'misses 2012', strong: false },
      { word: 'heat', label: 'Water + heat', value: 'ρ −0.66', note: 'catches 2012', strong: true },
    ],
    /** Stamped on row 2 on the spoken word: the number is a hold-out one. */
    stamp: { word: 'out', label: 'leave-one-out' },
    source: 'National wheat yield 1992–2024 (n = 33, FAOSTAT) · in the app repository: data/skill-heat.json',
  },
  close: {
    lead: 'Next:',
    line: 'every rainfed grain belt on Earth',
    url: 'shield-field.vercel.app',
  },
} as const;

/** Words set in the accent colour wherever a caption shows them. */
export const CAPTION_HIGHLIGHTS: readonly string[] = ['Ayaru', 'team Innovator', 'halved', '2012', 'May 28', 'worst years', 'tenge', 'heat', 'high caution', '33 years', 'out of sample'];

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
  /** false: spoken, but no subtitle (the scene sets the same words in big type). */
  readonly caption?: boolean;
};

/**
 * The voice-over, line by line, with the frames its subtitle is on screen (seconds = frame / 30). One line per scene,
 * cued a few frames into it, so every sentence plays over the picture it describes. `pnpm voiceover:tts` speaks each
 * line with the free Microsoft neural voice (edge-tts, en-US-JennyNeural, natural pace) into audio/lines/<NN>.mp3 with
 * its word timings; `pnpm voiceover` places each take at its `from` cue, builds public/voiceover.mp3 and writes
 * public/words.json (every word's onset), which the tags and reveals follow. `to` follows the measured take.
 */
export const LINES: readonly Line[] = [
  { from: 4, to: 81, text: 'Hi, I’m Ayaru, from team Innovator.' },
  { from: 82, to: 162, text: 'In 2012, drought halved wheat yields.' },
  { from: 165, to: 267, text: 'Click a field: risk, sowing date, confidence.' },
  { from: 270, to: 374, text: 'Sow around May 28 — safest in the worst years.' },
  { from: 377, to: 476, text: 'The calculator turns timing into money, in tenge.' },
  { from: 479, to: 569, text: 'Water balance, and heat with drought at flowering.' },
  { from: 572, to: 682, text: 'We replayed 2012: high caution before harvest.' },
  { from: 685, to: 802, text: '33 years back-tested; with heat, it holds out of sample.' },
  { from: 805, to: 885, text: 'Next: every rainfed grain belt on Earth.', caption: false },
];

export const INTRO_LINE_INDEX = 0;
export const HAZARDS_LINE_INDEX = 5;
export const BACKTEST_LINE_INDEX = 7;
export const CLOSE_LINE_INDEX = 8;

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
LINES.forEach((line, index) => {
  const previous = LINES[index - 1];
  if (line.to <= line.from) throw new Error(`script: line ${index} has no duration`);
  if (previous !== undefined && line.from < previous.to) throw new Error(`script: line ${index} overlaps the previous one`);
  if (line.to > TOTAL_FRAMES) throw new Error(`script: line ${index} runs past the end`);
});
