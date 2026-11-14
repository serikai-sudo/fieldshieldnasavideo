/**
 * THE script: every word that appears on screen or is spoken, and every frame range, in one place.
 *
 * Rules (NASA Space Apps video, Field Shift):
 *  - 30 fps, 1920×1080, TOTAL_FRAMES = 885 (29.5 s) — hard cap; NASA disqualifies anything over 30.0 s.
 *  - Only these numbers are added by the video: 16.61 and 7.93 c/ha (national wheat yield 2011 / 2012, FAOSTAT), the
 *    sowing date May 28 (data/snapshots/sowing/kostanay-01.json cvarOptimal 05-28), 8 crops (CROP_ORDER in the app's
 *    src/lib/model/crops.ts), 9 locations (data/skill-national.json perLocationSummary.count), and the two figures of
 *    the data captions: NASA POWER since 1984 (the first season of the app's record) and SRTM 30 m (the app's chip).
 *    Every other figure on screen is a pixel of the platform itself.
 *  - The 2012 replay and the national back-test are separate claims: in the back-test 2012 is a miss.
 *  - No "forecast", "predict", "flood", "real-time". English only.
 */

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** 29.5 s. */
export const TOTAL_FRAMES = 885;

export type SceneId = 'intro' | 'problem' | 'inside' | 'demoA' | 'demoB' | 'replay' | 'backtest' | 'data';

export type SceneSpec = {
  readonly id: SceneId;
  /** First frame of the scene in the composition (inclusive). */
  readonly from: number;
  /** Frames the scene lasts. */
  readonly duration: number;
};

/** The scenes, back to back, summing to TOTAL_FRAMES. Each scene carries one voice line and shows what it says. */
export const SCENES: readonly SceneSpec[] = [
  { id: 'intro', from: 0, duration: 80 },        // 0.0 – 2.7 s   "Hi, I'm Ayaru, from team Innovator."
  { id: 'problem', from: 80, duration: 85 },     // 2.7 – 5.5 s   the 2012 harvest
  { id: 'inside', from: 165, duration: 165 },    // 5.5 – 11.0 s  the real tab bar, word by word
  { id: 'demoA', from: 330, duration: 102 },     // 11.0 – 14.4 s the live map: pick a field, high caution
  { id: 'demoB', from: 432, duration: 99 },      // 14.4 – 17.7 s the Sowing tab: May 28
  { id: 'replay', from: 531, duration: 108 },    // 17.7 – 21.3 s the 2012 replay
  { id: 'backtest', from: 639, duration: 81 },   // 21.3 – 24.0 s the national back-test card
  { id: 'data', from: 720, duration: 165 },      // 24.0 – 29.5 s built on NASA Earth data, end card
];

export function scene(id: SceneId): SceneSpec {
  const found = SCENES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`script: unknown scene ${id}`);
  return found;
}

/**
 * Where each clip scene cuts its recording: `anchor` is an event of public/clips.json (logged by capture/tour.mjs),
 * `lead` the seconds shown before it. `click` is the event whose point gets the punch-in and the ring.
 */
export const CLIP_CUTS = {
  demoA: { clip: 'magic', anchor: 'nodeClick', lead: 1.5, click: 'nodeClick' },
  demoB: { clip: 'magic', anchor: 'sowingReady', lead: 0.15, click: null },
  replay: { clip: 'replay', anchor: 'replayClick', lead: 0.4, click: 'replayClick' },
} as const;

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
  inside: {
    title: 'Inside Field Shift',
    /**
     * What each spoken word of the strip line brings up: the real tab bar with that tab active (public/ui/dock-<tab>.png)
     * and the real piece of the platform it names (public/ui/<shot>.png). `word` is matched against the start of the
     * spoken word in public/words.json; `tab: null` keeps the tab bar as it was.
     */
    reveals: [
      { word: 'water', tab: 'water', shot: 'water' },
      { word: 'heat', tab: 'heat', shot: 'heat' },
      { word: 'sowing', tab: 'sowing', shot: 'sowing' },
      { word: 'economics', tab: 'sowing', shot: 'money' },
      { word: 'crops', tab: null, shot: 'crops-table' },
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
  demo: {
    highlight: 'Sow around May 28',
    placeholderA: 'LIVE PLATFORM: the map → Kostanay → High caution',
    placeholderB: 'LIVE PLATFORM: the Sowing tab → around May 28',
  },
  replay: { placeholder: 'LIVE PLATFORM: Replay 2012 → High caution before harvest' },
  backtest: {
    eyebrow: 'Confidence · back-test',
    /** Shown instead while public/ui/backtest.png is missing. */
    fallback: 'back-tested 1992–2024 · Spearman ρ = −0.63 · p < 0.001',
  },
  data: {
    title: 'Built on NASA Earth data',
    /** The NASA sources, from the team's slide; each lights up as the voice names it (`word`). */
    nasa: [
      { name: 'NASA POWER', caption: 'daily weather since 1984', word: 'nasa' },
      { name: 'SMAP', caption: 'soil wetness at season start', word: 'smap' },
      { name: 'SRTM', caption: 'height of the land, 30 m', word: 'srtm' },
      { name: 'MODIS', caption: 'day the field turned green', word: 'modis' },
    ],
    partnersTitle: 'with partners',
    partners: [
      { name: 'ESA WorldCover', caption: 'is this a real crop field?' },
      { name: 'SoilGrids', caption: 'water the soil can hold' },
      { name: 'FAOSTAT', caption: 'real harvests — the test' },
    ],
    url: 'shield-field.vercel.app',
    next: 'Next: every rainfed grain belt on Earth.',
  },
} as const;

/** Words set in the accent colour wherever a caption shows them. */
export const CAPTION_HIGHLIGHTS: readonly string[] = ['Ayaru', 'team Innovator', 'halved', 'high caution', 'May 28', '2012', 'NASA POWER', 'SMAP', 'SRTM', 'MODIS'];

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

/**
 * The voice-over, line by line, with the frames its subtitle is on screen (seconds = frame / 30). One line per scene,
 * cued a few frames into it, so every sentence plays over the picture it describes. `pnpm voiceover:tts` speaks each
 * line with the free Microsoft neural voice (edge-tts, en-US-JennyNeural, natural pace) into audio/lines/<NN>.mp3 with
 * its word timings; `pnpm voiceover` places each take at its `from` cue, builds public/voiceover.mp3 and writes
 * public/words.json (every word's onset), which the intro, the strip and the data scene reveal by. `to` follows the
 * measured take. The three partner sources are shown, not spoken.
 */
export const LINES: readonly Line[] = [
  { from: 4, to: 82, text: 'Hi, I’m Ayaru, from team Innovator.' },
  { from: 84, to: 167, text: 'In 2012, drought halved wheat yields.' },
  { from: 168, to: 330, text: 'Inside: water, heat, sowing, economics, eight crops, nine locations.' },
  { from: 333, to: 416, text: 'Pick a field — this season reads high caution.' },
  { from: 434, to: 529, text: 'Sow around May 28: the steadiest harvest.' },
  { from: 533, to: 640, text: 'We replayed 2012: high caution before harvest.' },
  { from: 642, to: 717, text: 'Back-tested against national wheat yields.' },
  { from: 723, to: 842, text: 'Built on NASA POWER, SMAP, SRTM and MODIS.' },
];

export const INTRO_LINE_INDEX = 0;
/** The line the strip scene reveals the tabs by. */
export const INSIDE_LINE_INDEX = 2;
export const DATA_LINE_INDEX = 7;

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
