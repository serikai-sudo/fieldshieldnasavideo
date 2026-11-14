/** 0–1.2 s: the mark draws in beside the wordmark on paper. */
import type React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Wordmark } from '../components/Wordmark';
import { fadeIn } from '../lib/anim';
import { theme } from '../theme';

export const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const settle = fadeIn(frame, 0, 14);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity: settle, transform: `translateY(${(1 - settle) * 14}px) scale(${0.97 + 0.03 * settle})` }}>
        <Wordmark size={128} progress={progress} />
      </div>
    </AbsoluteFill>
  );
};
