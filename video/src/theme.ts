/**
 * Design tokens of the video — the light "scientific paper" system of the Field Shift app (shield_field globals.css
 * .theme-paper), reproduced here so the video never imports from the app. Backgrounds are paper or white only; the
 * three risk colours mean a risk tier and nothing else (red appears only on the verdict / high-caution highlight).
 */
export const theme = {
  paper: '#FBFAF7',
  card: '#FFFFFF',
  ink: '#1A1C1E',
  ink2: '#6B685F',
  hairline: '#E9E7E0',
  /** Hover/tray surface of the app (line-2); used for quiet fills behind pills. */
  line2: '#F1EFE9',
  risk: {
    calm: '#2F7A54',
    watch: '#B07D1C',
    high: '#BE4238',
    calmTint: '#E8F1EB',
    highTint: '#F7E6E2',
  },
} as const;

/** Family names registered by src/fonts.ts (variable weight 100–900 for Fraunces, 100–900 for Inter). */
export const fonts = {
  display: "'Fraunces', Georgia, 'Times New Roman', serif",
  body: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
} as const;

/** Frame geometry shared by every scene. */
export const frame = {
  width: 1920,
  height: 1080,
  fps: 30,
  /** Safe margin from the frame edge for text (px). */
  margin: 96,
} as const;

export const radii = { card: 18, cardSm: 14, pill: 999 } as const;

export const shadow = {
  card: '0 1px 2px rgba(20, 20, 20, 0.05), 0 10px 30px rgba(20, 20, 20, 0.04)',
  pill: '0 1px 2px rgba(20, 20, 20, 0.06), 0 6px 18px rgba(20, 20, 20, 0.05)',
} as const;
