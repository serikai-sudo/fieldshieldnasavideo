/**
 * S5 · 20–29.5 s: the 2012 replay filmed on the live platform (public/clip-replay.mp4), the rigor stamp landing on it,
 * a fast labelled strip of four real screens (Water · Heat · The price of timing · Crops — each large, 0.6 s), and
 * the end card.
 */
import type React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { type Assets, CLIP_FILES, rateFor } from '../assets';
import { Placeholder } from '../components/Placeholder';
import { Stamp } from '../components/Stamp';
import { Wordmark } from '../components/Wordmark';
import { fadeIn } from '../lib/anim';
import { TEXT, VALIDATION } from '../script';
import { fonts, radii, shadow, theme } from '../theme';

const CLIP_SECONDS = VALIDATION.clipEnd / 30;

/** Each screen of the strip gets an equal share of the strip's frames. */
const STRIP_FRAMES = VALIDATION.stripTo - VALIDATION.stripFrom;
const SHOT_FRAMES = Math.floor(STRIP_FRAMES / TEXT.validation.strip.length);
const SHOT_W = 1360;
const SHOT_H = 765;

const ReplayClip: React.FC<{ readonly assets: Assets }> = ({ assets }) =>
  assets.replay.exists ? (
    <OffthreadVideo src={staticFile(CLIP_FILES.replay)} playbackRate={rateFor(assets.replay, CLIP_SECONDS)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <Placeholder text={TEXT.validation.placeholderReplay} file={CLIP_FILES.replay} />
  );

/** One real screen, large, with its label; slides in from the right and leaves to the left. */
const Shot: React.FC<{ readonly file: string; readonly label: string; readonly index: number; readonly exists: boolean }> = ({ file, label, index, exists }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 160, mass: 0.8 } });
  const x = (1 - enter) * 160;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 170 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, transform: `translateX(${x}px)`, opacity: Math.min(1, (frame + 1) / 3) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: fonts.body, fontSize: 26, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.ink2 }}>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: theme.ink }}>{index + 1}</span>
          <span aria-hidden="true" style={{ width: 28, height: 1, backgroundColor: theme.ink2 }} />
          {label}
        </div>
        <div
          style={{
            width: SHOT_W,
            height: SHOT_H,
            borderRadius: radii.card,
            overflow: 'hidden',
            border: `1px solid ${theme.hairline}`,
            boxShadow: shadow.card,
            backgroundColor: theme.card,
            position: 'relative',
          }}
        >
          {exists ? <Img src={staticFile(file)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : <Placeholder text={label} file={file} compact />}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Strip: React.FC<{ readonly assets: Assets }> = ({ assets }) => (
  <AbsoluteFill style={{ backgroundColor: theme.paper }}>
    {TEXT.validation.strip.map((shot, index) => (
      <Sequence key={shot.file} from={index * SHOT_FRAMES} durationInFrames={index === TEXT.validation.strip.length - 1 ? STRIP_FRAMES - index * SHOT_FRAMES : SHOT_FRAMES}>
        <Shot file={shot.file} label={shot.label} index={index} exists={assets.shots[shot.file] === true} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({ frame, fps, config: { damping: 18, stiffness: 90, mass: 1 } });
  const urlIn = fadeIn(frame, 10, 12);
  const nextIn = fadeIn(frame, 22, 12);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center', opacity: fadeIn(frame, 0, 6) }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, transform: `translateY(${-20 + (1 - settle) * 20}px)` }}>
        <Wordmark size={96} />
        <div style={{ fontFamily: fonts.display, fontSize: 64, fontWeight: 500, color: theme.ink, letterSpacing: '-0.01em', opacity: urlIn, transform: `translateY(${(1 - urlIn) * 12}px)` }}>
          {TEXT.validation.url}
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 36, fontWeight: 450, color: theme.ink2, opacity: nextIn, transform: `translateY(${(1 - nextIn) * 12}px)` }}>{TEXT.validation.next}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Scene05Validation: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const sceneIn = fadeIn(frame, 0, 6);
  // The stamp stays on through the strip and leaves as the end card arrives.
  const stampOut = interpolate(frame, [VALIDATION.endFrom - 8, VALIDATION.endFrom], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, opacity: sceneIn }}>
      <Sequence from={0} durationInFrames={VALIDATION.clipEnd} premountFor={15}>
        <ReplayClip assets={assets} />
      </Sequence>
      <Sequence from={VALIDATION.stripFrom} durationInFrames={VALIDATION.stripTo - VALIDATION.stripFrom}>
        <Strip assets={assets} />
      </Sequence>
      <Sequence from={VALIDATION.endFrom}>
        <EndCard />
      </Sequence>
      {frame < VALIDATION.endFrom && <Stamp from={VALIDATION.stampIn} top={40} opacity={stampOut} />}
    </AbsoluteFill>
  );
};
