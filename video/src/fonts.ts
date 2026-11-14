/**
 * Fraunces (display, numbers) and Inter (UI, body) as variable web fonts, loaded from public/fonts — copied there from
 * their npm packages at install (scripts/copy-fonts.mjs). No network at render time; the render is deterministic.
 */
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

let pending: Promise<void> | null = null;

/** Loads both families once; resolves when they are usable. Rejects only if a file is missing. */
export function ensureFonts(): Promise<void> {
  if (pending === null) {
    pending = Promise.all([
      loadFont({ family: 'Fraunces', url: staticFile('fonts/fraunces.woff2'), format: 'woff2', weight: '100 900' }),
      loadFont({ family: 'Inter', url: staticFile('fonts/inter.woff2'), format: 'woff2', weight: '100 900' }),
    ]).then(() => undefined);
  }
  return pending;
}
