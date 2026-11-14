/**
 * THE script: every word that appears on screen or is spoken, and every frame range, in one place.
 *
 * Rules (NASA Space Apps video, Field Shift):
 *  - 30 fps, 1920×1080, TOTAL_FRAMES = 885 (29.5 s) — hard cap; NASA disqualifies anything over 30.0 s.
 *  - Numbers added by the video, each with its source: 16.61 and 7.93 c/ha (national wheat yield 2011 / 2012, FAOSTAT,
 *    the app's data/yields-national-kz.json); May 28 (data/snapshots/sowing/kostanay-01.json cvarOptimal 05-28); eight
 *    crops (the app's crop registry and crop table, "each crop at its own best date"; only wheat is validated, which the
 *    tag says); 55 days (the app's own 2012 replay line); 33 years, ρ −0.63, p < 0.001 (data/skill-national.json); ρ −0.66
 *    leave-one-out for water + heat, and which years each signal flags (data/skill-heat.json, the app repository at
 *    8e5fa1b — not yet on the live site, so the scene says where it is from). Every other figure on screen is a pixel of
 *    the platform itself.
 *  - The water signal alone misses 2012; the replay and the heat line are what catch it — said as such.
 *  - No "forecast", "predict", "flood", "real-time". English only.
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** 29.5 s. */
export const TOTAL_FRAMES = 885;

export type SceneId = 'intro' | 'problem' | 'blind' | 'click' | 'facets' | 'sowing' | 'money' | 'proof' | 'backtest' | 'close';

export type SceneSpec = {
  readonly id: SceneId;
  /** First frame of the scene in the composition (inclusive). */
  readonly from: number;
  /** Frames the scene lasts. */
  readonly duration: number;
};

/**
 * The scenes, back to back, summing to TOTAL_FRAMES, sized to the measured takes. Two lines span two scenes: the click
 * line cuts from the map to the tabs on "water", the proof line from the replay to the back-test on "and holds".
 */
export const SCENES: readonly SceneSpec[] = [
  { id: 'intro', from: 0, duration: 61 },
  { id: 'problem', from: 61, duration: 118 },
  { id: 'blind', from: 179, duration: 72 },
  { id: 'click', from: 251, duration: 84 },
  { id: 'facets', from: 335, duration: 56 },
  { id: 'sowing', from: 391, duration: 96 },
  { id: 'money', from: 487, duration: 89 },
  { id: 'proof', from: 576, duration: 127 },
  { id: 'backtest', from: 703, duration: 63 },
  { id: 'close', from: 766, duration: 119 },
];

export function scene(id: SceneId): SceneSpec {
  const found = SCENES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`script: unknown scene ${id}`);
  return found;
}

/* ------------------------------------------------------------------------------------------- the filmed clips */

/** When something happens in a clip scene: at a logged event of the recording, or on a spoken word. */
export type Cue = { readonly event: string } | { readonly line: number; readonly word: string };

/** The camera glides (eased) to a logged element and zooms to `scale`; the frame never shows past the recording. */
export type CameraMove = { readonly when: Cue; readonly target: string; readonly scale: number };

/** A brick-red box drawn around a logged element, or a line under it. */
export type Mark = { readonly when: Cue; readonly target: string; readonly kind: 'box' | 'underline' };

export type ClipCut = {
  readonly clip: 'magic' | 'replay' | 'money';
  /**
   * The event of public/clips.json the cut is anchored on. It plays on the spoken word `sync` when given (the click
   * lands on "click"), else `lead` seconds after the scene starts.
   */
  readonly anchor: string;
  readonly lead: number;
  readonly sync?: { readonly line: number; readonly word: string };
  /** Clicks marked with a brick-red ring. */
  readonly rings: readonly string[];
  readonly camera: readonly CameraMove[];
  readonly marks: readonly Mark[];
  /** Rings rippling across several elements, one after another (the crop pills). */
  readonly ripples?: { readonly when: Cue; readonly targets: readonly string[] };
  /** A fixed framing of the recording: scaled by `scale` around the point (x, y) of the 1920×1080 frame. */
  readonly view?: { readonly scale: number; readonly x: number; readonly y: number };
};

const PILLS = ['cropPill0', 'cropPill1', 'cropPill2', 'cropPill3', 'cropPill4', 'cropPill5', 'cropPill6', 'cropPill7'] as const;

/** Where each clip scene cuts its recording and what it points at (events logged by capture/tour.mjs, calibrated). */
export const CLIP_CUTS = {
  click: {
    clip: 'magic',
    anchor: 'nodeClick',
    lead: 1.2,
    sync: { line: 3, word: 'click' },
    rings: ['nodeClick'],
    camera: [
      { when: { event: 'nodeClick' }, target: 'nodeClick', scale: 1.05 },
      { when: { event: 'panelShown' }, target: 'verdict', scale: 1.16 },
    ],
    marks: [{ when: { event: 'panelShown' }, target: 'verdict', kind: 'box' }],
  },
  sowing: {
    clip: 'magic',
    anchor: 'sowingReady',
    lead: 0.15,
    rings: [],
    camera: [
      { when: { line: 4, word: 'eight' }, target: 'cropPills', scale: 1.08 },
      { when: { line: 4, word: 'safest' }, target: 'sowingHeadline', scale: 1.14 },
    ],
    marks: [{ when: { line: 4, word: 'safest' }, target: 'sowingHeadline', kind: 'box' }],
    ripples: { when: { line: 4, word: 'eight' }, targets: PILLS },
  },
  // The calculator fills the left of the frame (slider at the top, the "gives up" sentence above the captions).
  money: {
    clip: 'money',
    anchor: 'kztClick',
    lead: 0.4,
    sync: { line: 5, word: 'calculator' },
    rings: ['kztClick'],
    camera: [{ when: { event: 'givesUp' }, target: 'givesUp', scale: 1.07 }],
    marks: [{ when: { event: 'givesUp' }, target: 'givesUp', kind: 'underline' }],
    view: { scale: 1.4, x: 639, y: 110 },
  },
  proof: {
    clip: 'replay',
    anchor: 'replayClick',
    lead: 1.0,
    sync: { line: 6, word: '2012' },
    rings: ['replayClick'],
    camera: [
      { when: { line: 6, word: 'warned' }, target: 'cautionRow', scale: 1.12 },
      { when: { line: 6, word: '55' }, target: 'daysLine', scale: 1.24 },
    ],
    marks: [
      { when: { line: 6, word: 'warned' }, target: 'cautionRow', kind: 'box' },
      { when: { line: 6, word: '55' }, target: 'daysLine', kind: 'underline' },
    ],
  },
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
    /** The drop measured on the chart, drawn when the voice says "half". */
    drop: 'half',
  },
  blind: {
    question: 'When to sow?',
    months: ['Apr', 'May', 'Jun'],
    stamp: 'almost blind',
  },
  click: {
    placeholder: 'LIVE PLATFORM: the map → Kostanay → the season in one panel',
  },
  /** The tabs named by the click line, each with the top of its real card (crop in CSS px of public/ui/<shot>.png). */
  facets: {
    reveals: [
      { word: 'water', tab: 'water', shot: 'water', crop: 104 },
      { word: 'heat', tab: 'heat', shot: 'heat', crop: 150 },
      { word: 'sure', tab: 'confidence', shot: 'confidence', crop: 100 },
    ],
  },
  sowing: {
    highlight: 'Sow around May 28',
    placeholder: 'LIVE PLATFORM: the Sowing tab → around May 28',
    tags: [{ line: 4, word: 'crops', label: '8 crops', sub: 'wheat validated · 7 experimental' }] satisfies readonly Tag[],
  },
  money: {
    placeholder: 'LIVE PLATFORM: the price of timing → in tenge',
    tags: [
      { line: 5, word: 'calculator', label: 'The price of timing', sub: 'area × revenue × dry-year share' },
      { line: 5, word: 'tenge', label: 'USD or ₸', sub: 'at the National Bank rate' },
    ] satisfies readonly Tag[],
  },
  proof: {
    question: 'Does it work?',
    placeholder: 'LIVE PLATFORM: Replay 2012 → High caution before harvest',
  },
  backtest: {
    eyebrow: 'Confidence · back-test',
    /** Shown instead while public/ui/backtest.png is missing. */
    fallback: 'back-tested 1992–2024 · Spearman ρ = −0.63 · p < 0.001',
    rows: [
      { word: 'holds', label: 'Water alone', rho: -0.63, note: 'misses 2012', strong: false },
      { word: '33', label: 'Water + heat', rho: -0.66, note: 'catches 2012', strong: true },
    ],
    /** Stamped on row 2 a beat after it lands: the number is a hold-out one. */
    stamp: { word: '33', delay: 8, label: 'leave-one-out' },
    source: 'National wheat yield 1992–2024 (n = 33, FAOSTAT) · in the app repository: data/skill-heat.json',
  },
  close: {
    /** Where the map works today, under the silhouette ("For now Northern Kazakhstan"). */
    region: 'Northern Kazakhstan · for now',
    lead: 'Next:',
    line: 'every rainfed grain belt on Earth',
    url: 'shield-field.vercel.app',
  },
} as const;

/** Words set in the accent colour wherever a caption shows them, besides the `*…*` phrases of the lines. */
export const CAPTION_HIGHLIGHTS: readonly string[] = ['Ayaru', 'team Innovator', '2012', 'May 28'];

/* ------------------------------------------------------------------------------------------ voice-over + captions */

export type Line = {
  /** First frame the caption is on screen. */
  readonly from: number;
  /** Last frame (exclusive). */
  readonly to: number;
  /**
   * Spoken and burned in as the subtitle; keep to two lines at 34 px over ~1200 px. `*…*` marks the phrase that must
   * land: the voice lifts it (higher, louder, a touch slower) and the subtitle sets it in the accent colour.
   */
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
 * cued a few frames into it, so every sentence plays over the picture it describes; the linking words ("First", "Yet",
 * "So", "Then", "And", "Does it work?", "Next") carry the story from one scene to the next. `pnpm voiceover:tts` speaks
 * each line with the free Microsoft neural voice (edge-tts, en-US-AvaMultilingualNeural, natural pace) into
 * audio/lines/<NN>.mp3 with its word timings; `pnpm voiceover` places each take at its `from` cue, builds
 * public/voiceover.mp3 and writes public/words.json (every word's onset), which every reveal follows.
 */
export const LINES: readonly Line[] = [
  { from: 1, to: 61, text: 'I’m Ayaru, from team Innovator.' },
  { from: 62, to: 179, text: 'The problem: in 2012 drought cut our wheat harvest *in half*.' },
  { from: 180, to: 251, text: 'Yet sowing is still decided *almost blind*.' },
  { from: 252, to: 391, text: 'So we built Field Shift: one click shows water and heat risk, and how sure it is.' },
  { from: 392, to: 487, text: 'Then, for eight crops: *the safest sowing date*.' },
  { from: 488, to: 576, text: 'The calculator prices late sowing, *in tenge*.' },
  { from: 577, to: 766, text: 'Does it work? In 2012 it warned *55 days before harvest*, and holds over 33 years.' },
  { from: 767, to: 885, text: 'For now Northern Kazakhstan, next: *every rainfed grain belt on Earth*.', caption: false },
];

export const INTRO_LINE_INDEX = 0;
export const PROBLEM_LINE_INDEX = 1;
export const BLIND_LINE_INDEX = 2;
export const CLICK_LINE_INDEX = 3;
export const PROOF_LINE_INDEX = 6;
export const BACKTEST_LINE_INDEX = 6;
export const CLOSE_LINE_INDEX = 7;

/** The base pitch of a line's plain words (edge-tts prosody), where it is not the voice's own: the problem, said low. */
export const LINE_TONE: Readonly<Record<number, string>> = { 1: '-2Hz', 2: '-2Hz' };

export type Segment = { readonly text: string; readonly emphasis: boolean };

/** A line's text cut at its `*…*` marks: the plain runs and the phrases that must land. */
export function segmentsOf(text: string): readonly Segment[] {
  const segments: Segment[] = [];
  for (const part of text.split(/(\*[^*]+\*)/).map((piece) => piece.trim())) {
    if (part.length === 0) continue;
    const previous = segments[segments.length - 1];
    // Punctuation after a phrase belongs to it ("*in half*." ends with the full stop), never a segment of its own.
    if (/^[.,:;!?—]+$/.test(part) && previous !== undefined) {
      segments[segments.length - 1] = { ...previous, text: previous.text + part };
      continue;
    }
    segments.push(part.startsWith('*') ? { text: part.slice(1, -1), emphasis: true } : { text: part, emphasis: false });
  }
  return segments;
}

/** How the voice should say a written token, where its default reading is slow or wrong ("2012" as "twenty-twelve"). */
export const SAY: Readonly<Record<string, string>> = { '2012': 'twenty-twelve' };

/** A line as it reads on screen: the marks removed. */
export function plainText(text: string): string {
  return text.replace(/\*/g, '');
}

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
