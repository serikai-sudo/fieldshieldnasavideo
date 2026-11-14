/** S3 · 3.2–4.2 s: the mark and wordmark centred, the tagline chip under them. */
import type React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Chip } from '../components/Chip';
import { Wordmark } from '../components/Wordmark';
import { fadeIn } from '../lib/anim';
import { TEXT } from '../script';
import { theme } from '../theme';

export const Scene03Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneIn = fadeIn(frame, 0, 5);
  const settle = spring({ frame, fps, config: { damping: 18, stiffness: 140, mass: 0.8 } });
  const chipIn = fadeIn(frame, 4, 10);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center', opacity: sceneIn }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56, transform: `translateY(${-30 + (1 - settle) * 20}px) scale(${0.96 + 0.04 * settle})` }}>
        <Wordmark size={120} />
        <Chip label={TEXT.tagline} tone="card" size={34} style={{ opacity: chipIn, transform: `translateY(${(1 - chipIn) * 14}px)`, padding: '18px 36px' }} />
      </div>
    </AbsoluteFill>
  );
};
