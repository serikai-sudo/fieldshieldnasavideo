/** S1 · 0–1.2 s: paper, the mark draws in, FIELD SHIFT in Fraunces, the byline. */
import type React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { BrandMark } from '../components/BrandMark';
import { fadeIn } from '../lib/anim';
import { TEXT } from '../script';
import { fonts, theme } from '../theme';

export const Scene01Title: React.FC = () => {
  const frame = useCurrentFrame();
  const markProgress = interpolate(frame, [0, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleIn = fadeIn(frame, 4, 12);
  const bylineIn = fadeIn(frame, 12, 10);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, transform: 'translateY(-24px)' }}>
        <BrandMark size={168} progress={markProgress} />
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 136,
            fontWeight: 600,
            letterSpacing: '0.06em',
            lineHeight: 1,
            color: theme.ink,
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 18}px)`,
          }}
        >
          {TEXT.title}
        </div>
        <div
          style={{
            fontFamily: fonts.body,
            fontSize: 32,
            fontWeight: 450,
            letterSpacing: '0.02em',
            color: theme.ink2,
            opacity: bylineIn,
            transform: `translateY(${(1 - bylineIn) * 12}px)`,
          }}
        >
          {TEXT.byline}
        </div>
      </div>
    </AbsoluteFill>
  );
};
