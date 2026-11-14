/**
 * Edit-style motion between scenes. `WhipShell` throws a scene in from the right and out to the left with a horizontal
 * motion blur; `WipeBars` sweeps a slanted brick-red bar across every cut. Paper stays paper: only the accent moves.
 */
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { clamp01, easeOut } from '../lib/anim';
import { SCENES } from '../script';
import { theme } from '../theme';

const WHIP_PX = 220;
const BLUR_PX = 18;

export const WhipShell: React.FC<{ readonly duration: number; readonly inFrames?: number; readonly outFrames?: number; readonly children: React.ReactNode }> = ({
  duration,
  inFrames = 7,
  outFrames = 5,
  children,
}) => {
  const frame = useCurrentFrame();
  const enter = inFrames === 0 ? 1 : easeOut(clamp01(frame / inFrames));
  const leaveLinear = outFrames === 0 ? 0 : clamp01((frame - (duration - outFrames)) / outFrames);
  const leave = leaveLinear * leaveLinear;
  const x = (1 - enter) * WHIP_PX - leave * WHIP_PX;
  const blur = (1 - enter) * BLUR_PX + leave * BLUR_PX;
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : undefined, opacity: 0.35 + 0.65 * enter * (1 - 0.4 * leave) }}>
      {children}
    </AbsoluteFill>
  );
};

const BAR_HALF = 6;

/** A slanted accent bar crossing the frame on each scene cut (composition-level overlay). */
export const WipeBars: React.FC = () => {
  const frame = useCurrentFrame();
  const cut = SCENES.slice(1).find((item) => Math.abs(frame - item.from) <= BAR_HALF);
  if (cut === undefined) return null;
  const progress = (frame - (cut.from - BAR_HALF)) / (2 * BAR_HALF);
  const x = -520 + progress * 3000;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -120, left: x, width: 150, height: 1320, backgroundColor: theme.accent, transform: 'skewX(-16deg)', opacity: 0.95 }} />
      <div style={{ position: 'absolute', top: -120, left: x - 70, width: 22, height: 1320, backgroundColor: theme.ink, transform: 'skewX(-16deg)', opacity: 0.85 }} />
    </AbsoluteFill>
  );
};
