/**
 * The rigor stamp: the back-test line, exactly as written in script.ts, on a white card with an ink rule, stamped in
 * with a spring (slightly oversized and tilted, settling almost flat), centred across the top of the frame.
 * Fraunces for the statistics, tabular figures.
 */
import type React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TEXT } from '../script';
import { fonts, radii, shadow, theme } from '../theme';

export const Stamp: React.FC<{ readonly from: number; readonly top?: number; readonly opacity?: number }> = ({ from, top = 40, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from) return null;
  const pop = spring({ frame: frame - from, fps, config: { damping: 14, stiffness: 160, mass: 0.8 } });
  const scale = 1.25 - 0.25 * pop;
  const rotate = -4 + 2.6 * pop;
  const fade = Math.min(1, (frame - from + 1) / 4) * opacity;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div
        style={{
          opacity: fade,
          transform: `scale(${scale}) rotate(${rotate}deg)`,
          transformOrigin: 'center',
          backgroundColor: theme.card,
          border: `2.5px solid ${theme.ink}`,
          borderRadius: radii.cardSm,
          boxShadow: shadow.card,
          padding: '16px 30px',
          fontFamily: fonts.display,
          fontSize: 36,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.01em',
          color: theme.ink,
          whiteSpace: 'nowrap',
        }}
      >
        {TEXT.validation.stamp}
      </div>
    </div>
  );
};
