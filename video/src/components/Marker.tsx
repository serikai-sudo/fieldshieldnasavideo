/**
 * A brick-red mark drawn onto a real element of a filmed page: a rounded box that draws itself around it (the stroke
 * runs from the top-left corner round the box, with a small overshoot pop), or a line that swipes under it. Placed in
 * the clip's own pixels, inside the layer the camera moves, so it stays on its element.
 */
import type React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp01, easeOut } from '../lib/anim';
import { theme } from '../theme';

const DRAW_FRAMES = 11;
const PAD = 14;

export const Marker: React.FC<{
  readonly kind: 'box' | 'underline';
  /** The element's centre and size in clip pixels. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** The scene frame the mark starts drawing. */
  readonly from: number;
}> = ({ kind, x, y, w, h, from }) => {
  const frame = useCurrentFrame();
  const t = frame - from;
  if (t < 0) return null;
  const draw = easeOut(clamp01(t / DRAW_FRAMES));
  if (kind === 'underline') {
    return (
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: x - w / 2 - 6, top: y + h / 2 + 4, width: w + 12, height: 5, borderRadius: 3, backgroundColor: theme.accent, transformOrigin: 'left', transform: `scaleX(${draw})` }}
      />
    );
  }
  const width = w + 2 * PAD;
  const height = h + 2 * PAD;
  const radius = Math.min(18, height / 2);
  const perimeter = 2 * (width + height) - (8 - 2 * Math.PI) * radius;
  // A pop once drawn: 1 → 1.04 → 1.
  const pop = 1 + 0.04 * Math.sin(Math.PI * clamp01((t - DRAW_FRAMES + 2) / 8));
  return (
    <svg
      aria-hidden="true"
      width={width + 12}
      height={height + 12}
      style={{ position: 'absolute', left: x - width / 2 - 6, top: y - height / 2 - 6, overflow: 'visible', transform: `scale(${pop})`, transformOrigin: 'center' }}
    >
      <rect x={6} y={6} width={width} height={height} rx={radius} fill="none" stroke={theme.accent} strokeWidth={5} strokeDasharray={perimeter} strokeDashoffset={perimeter * (1 - draw)} strokeLinecap="round" />
    </svg>
  );
};
