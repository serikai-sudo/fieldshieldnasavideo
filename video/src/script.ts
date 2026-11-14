/**
 * THE script: every word that appears on screen or is spoken, and every frame range, in one place.
 *
 * Rules (NASA Space Apps video, Field Shift):
 *  - 30 fps, 1920×1080, TOTAL_FRAMES = 885 (29.5 s) — hard cap; NASA disqualifies anything over 30.0 s.
 *  - Only these numbers may appear: 16.61 and 7.93 c/ha (national wheat yield 2011 / 2012, FAOSTAT),
 *    1992–2024, Spearman ρ = −0.63, p < 0.001 (data/skill-national.json of the app), and the sowing date
 *    May 28 (data/snapshots/sowing/kostanay-01.json cvarOptimal 05-28). Nothing else is invented.
 *    The feature strip adds two counts: 8 crops (CROP_ORDER in the app's src/lib/model/crops.ts) and 9 locations
 *    (data/skill-national.json perLocationSummary.count).
 *  - No "forecast", "predict", "flood", "real-time". English only.
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** 29.5 s. */
export const TOTAL_FRAMES = 885;

export type SceneId = 'title' | 'problem' | 'logo' | 'inside' | 'magic' | 'validation';

export type SceneSpec = {
  readonly id: SceneId;
  /** First frame of the scene in the composition (inclusive). */
  readonly from: number;
  /** Frames the scene lasts. */
  readonly duration: number;
};

/** The six scenes, back to back, summing to TOTAL_FRAMES. The live clip and the validation beat never move. */
export const SCENES: readonly SceneSpec[] = [
  { id: 'title', from: 0, duration: 36 },        // 0.0 – 1.2 s
  { id: 'problem', from: 36, duration: 60 },     // 1.2 – 3.2 s
  { id: 'logo', from: 96, duration: 30 },        // 3.2 – 4.2 s
  { id: 'inside', from: 126, duration: 174 },    // 4.2 – 10.0 s  "Inside Field Shift": the real tab bar, word by word
  { id: 'magic', from: 300, duration: 300 },     // 10.0 – 20.0 s
  { id: 'validation', from: 600, duration: 285 },// 20.0 – 29.5 s
];

export function scene(id: SceneId): SceneSpec {
  const found = SCENES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`script: unknown scene ${id}`);
  return found;
}

/** Inside Scene 5 (frames relative to its start, 285 total). */
export const VALIDATION = {
  /** The replay clip plays from 0 to this frame (4.6 s). */
  clipEnd: 138,
  /** The rigor stamp starts animating in while the clip is still on screen. */
  stampIn: 96,
  /** The four-shot strip. */
  stripFrom: 138,
  stripTo: 210,
  /** The end card. */
  endFrom: 210,
} as const;

/** Inside Scene 4 (frames relative to its start, 300 total). */
export const MAGIC = {
  /** Source pills slide in one after another. */
  pillsFrom: 30,
  pillGap: 18,
  /** The kinetic "Sow around May 28" highlight. */
  highlightFrom: 225,
  highlightTo: 300,
} as const;

/* ------------------------------------------------------------------------------------------------ on-screen text */

export const TEXT = {
  title: 'FIELD SHIFT',
  byline: 'Ayaru · team Innovator',
  problem: {
    label: '2012 drought — national wheat yield fell by about half',
    unit: 'c/ha',
    source: 'FAOSTAT',
    bars: [
      { year: '2011', value: 16.61 },
      { year: '2012', value: 7.93 },
    ],
    region: 'Northern Kazakhstan · spring-wheat belt',
  },
  tagline: 'NASA Earth data → field-level climate risk',
  inside: {
    title: 'Inside Field Shift',
    /**
     * What each spoken word of the strip line brings up: the real tab bar with that tab active (public/ui/dock-<tab>.png)
     * and the real piece of the field page it names (public/ui/<shot>.png). `word` is matched against the start of the
     * spoken word in public/words.json; `tab: null` keeps the tab bar as it was.
     */
    reveals: [
      { word: 'water', tab: 'water', shot: 'water' },
      { word: 'heat', tab: 'heat', shot: 'heat' },
      { word: 'sowing', tab: 'sowing', shot: 'sowing' },
      { word: 'economics', tab: 'sowing', shot: 'money' },
      { word: 'crops', tab: null, shot: 'crops' },
      { word: 'nine', tab: 'confidence', shot: 'locations' },
    ],
    /** Shown instead, as plain chips, while public/ui/ is missing. */
    chips: [
      'Water balance · FAO-56',
      'Heat × drought · compound',
      'Sowing window · CVaR',
      'Price of timing · economic',
      '8 crops',
      'Confidence · uncertainty',
      '9-location robustness',
      'Analogs · leave-one-out',
    ],
  },
  magic: {
    pills: ['NASA POWER', 'SMAP', 'MODIS'],
    highlight: 'Sow around May 28',
    placeholder: 'LIVE PLATFORM: click field → High caution → Sow May 28',
  },
  validation: {
    stamp: 'back-tested 1992–2024 · Spearman ρ = −0.63 · p < 0.001',
    strip: [
      { file: 'shot-water.png', label: 'Water' },
      { file: 'shot-heat.png', label: 'Heat' },
      { file: 'shot-money.png', label: 'The price of timing' },
      { file: 'shot-crops.png', label: 'Crops' },
    ],
    placeholderReplay: 'LIVE PLATFORM: Replay 2012 → High caution before harvest',
    url: 'shield-field.vercel.app',
    next: 'Next: every rainfed grain belt on Earth.',
  },
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
  /** The frame the spoken take must end by, when earlier than the next spoken cue (an unspoken caption follows). */
  readonly spokenUntil?: number;
};

/**
 * The voice-over, line by line, with the frames its subtitle is on screen (seconds = frame / 30). Each line is also
 * the burned-in English subtitle. `pnpm voiceover:tts` speaks every line with the free Microsoft neural voice
 * (edge-tts, en-US-JennyNeural, natural pace) into audio/lines/<NN>.mp3 plus its word timings; `pnpm voiceover` places
 * each take at its `from` cue to build public/voiceover.mp3 and writes public/words.json (every word's onset in
 * composition seconds), which the strip scene reveals the tabs by. `to` follows the measured take.
 * 1992–2024, ρ = −0.63 and p < 0.001 are on the rigor stamp, not spoken.
 */
export const LINES: readonly Line[] = [
  { from: 3, to: 34, text: 'Field Shift.' },
  { from: 35, to: 121, text: 'In 2012, drought halved wheat yields.' },
  { from: 127, to: 306, text: 'Inside: water, heat, sowing, economics, eight crops, nine-location robustness.' },
  { from: 312, to: 419, text: 'Pick a field. This season reads high caution.' },
  { from: 456, to: 577, text: 'The decision: sow around May 28 — the steadiest harvest.' },
  { from: 600, to: 708, text: 'We replayed 2012: high caution before harvest.' },
  { from: 711, to: 786, text: 'Back-tested against national wheat yields.' },
  { from: 801, to: 882, text: 'Next: every rainfed grain belt on Earth.' },
];

/** The line the strip scene reveals the tabs by. */
export const INSIDE_LINE_INDEX = 2;

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
