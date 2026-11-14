/** 27.7–29.5 s: the wordmark and the address. */
import type React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Wordmark } from '../components/Wordmark';
import { fadeIn } from '../lib/anim';
import { TEXT } from '../script';
import { fonts, theme } from '../theme';

export const SceneEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({ frame, fps, config: { damping: 18, stiffness: 90, mass: 1 } });
  const urlIn = fadeIn(frame, 8, 12);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center', opacity: fadeIn(frame, 0, 8) }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, transform: `translateY(${-16 + (1 - settle) * 18}px)` }}>
        <Wordmark size={96} />
        <div style={{ fontFamily: fonts.display, fontSize: 60, fontWeight: 500, color: theme.ink, letterSpacing: '-0.01em', opacity: urlIn, transform: `translateY(${(1 - urlIn) * 12}px)` }}>
          {TEXT.url}
        </div>
      </div>
    </AbsoluteFill>
  );
};
