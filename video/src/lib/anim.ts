import { interpolate } from 'remotion';

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 0 → 1 over `length` frames starting at `from`, clamped. */
export function fadeIn(frame: number, from: number, length: number): number {
  return interpolate(frame, [from, from + length], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

/** 1 → 0 over `length` frames starting at `from`, clamped. */
export function fadeOut(frame: number, from: number, length: number): number {
  return interpolate(frame, [from, from + length], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

/** Ease-out cubic on a 0..1 progress. */
export function easeOut(progress: number): number {
  const p = clamp01(progress);
  return 1 - Math.pow(1 - p, 3);
}

/** Ease-in-out cubic on a 0..1 progress. */
export function easeInOut(progress: number): number {
  const p = clamp01(progress);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}
