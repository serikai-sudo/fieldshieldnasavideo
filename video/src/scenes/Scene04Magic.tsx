/**
 * S4 · 10–20 s: the live platform, filmed — public/clip-magic.mp4 full-frame (sped up to at most 1.5× to fit the
 * slot); three source pills slide in on the right while the map is on screen; the kinetic highlight "Sow around
 * May 28" lands while the Sowing dial is on screen. A labelled placeholder stands in while the clip is missing.
 */
import type React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { type Assets, CLIP_FILES, rateFor } from '../assets';
import { Pill } from '../components/Pill';
import { Placeholder } from '../components/Placeholder';
import { fadeIn } from '../lib/anim';
import { MAGIC, TEXT, scene } from '../script';
import { fonts, shadow, theme } from '../theme';

const SLOT_SECONDS = scene('magic').duration / 30;
/** Pills leave before the highlight arrives. */
const PILLS_OUT = 196;

const SourcePills: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', right: 96, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
      {TEXT.magic.pills.map((label, index) => {
        const start = MAGIC.pillsFrom + index * MAGIC.pillGap;
        const enter = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 120, mass: 0.9 } });
        const leave = interpolate(frame, [PILLS_OUT + index * 4, PILLS_OUT + index * 4 + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const x = (1 - enter) * 320 + leave * 360;
        const opacity = frame < start ? 0 : 1 - leave;
        return <Pill key={label} label={label} style={{ transform: `translateX(${x}px)`, opacity }} />;
      })}
    </div>
  );
};

/**
 * "Sow around May 28": a paper band slides down over the top of the frame and the words land in it one by one, the
 * date in the app's decision green. A band, not a floating card, so it never collides with the page underneath.
 */
const Highlight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < MAGIC.highlightFrom) return null;
  const local = frame - MAGIC.highlightFrom;
  const words = TEXT.magic.highlight.split(' ');
  const bandIn = spring({ frame: local, fps, config: { damping: 18, stiffness: 150, mass: 0.8 } });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 168,
        transform: `translateY(${(1 - bandIn) * -168}px)`,
        backgroundColor: 'rgba(251, 250, 247, 0.96)',
        borderBottom: `1px solid ${theme.hairline}`,
        boxShadow: shadow.card,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        fontFamily: fonts.display,
        fontSize: 84,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        color: theme.ink,
        whiteSpace: 'nowrap',
      }}
    >
      {words.map((word, index) => {
        const wordIn = spring({ frame: local - 5 - index * 5, fps, config: { damping: 14, stiffness: 170, mass: 0.7 } });
        const isDate = index >= words.length - 2;
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: 'inline-block',
              opacity: local < 5 + index * 5 ? 0 : 1,
              transform: `translateY(${(1 - wordIn) * 30}px) scale(${0.8 + 0.2 * wordIn})`,
              color: isDate ? theme.risk.calm : theme.ink,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export const Scene04Magic: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const sceneIn = fadeIn(frame, 0, 6);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, opacity: sceneIn }}>
      {assets.magic.exists ? (
        <OffthreadVideo
          src={staticFile(CLIP_FILES.magic)}
          playbackRate={rateFor(assets.magic, SLOT_SECONDS)}
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Placeholder text={TEXT.magic.placeholder} file={CLIP_FILES.magic} />
      )}
      <SourcePills />
      <Highlight />
    </AbsoluteFill>
  );
};
