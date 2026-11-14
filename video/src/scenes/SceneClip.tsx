/**
 * A cut of a real recording of the live platform, anchored on a logged event (script.ts CLIP_CUTS, public/clips.json):
 * it starts `lead` seconds before the event, so the voice line cued at the scene's start always plays over the picture
 * it describes. On the click event the camera punches in towards the click and a brick-red ring marks it; a slow push
 * runs under the whole cut. Without the clip or its events, a labelled placeholder.
 */
import type React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { type Assets, CLIP_FILES, eventSec } from '../assets';
import { Placeholder } from '../components/Placeholder';
import { clamp01, easeOut } from '../lib/anim';
import { CLIP_CUTS, FPS, HEIGHT, WIDTH } from '../script';
import { theme } from '../theme';

type CutId = keyof typeof CLIP_CUTS;

const PUNCH = 0.07;
const PUNCH_FRAMES = 8;
const RING_FRAMES = 18;

export const SceneClip: React.FC<{ readonly assets: Assets; readonly cut: CutId; readonly placeholder: string; readonly children?: React.ReactNode }> = ({
  assets,
  cut,
  placeholder,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const spec = CLIP_CUTS[cut];
  const clip = assets[spec.clip];
  const anchor = eventSec(clip.events[spec.anchor]);
  const startSec = anchor === null ? null : Math.max(0, anchor - spec.lead);
  const clickEvent = spec.click === null ? undefined : clip.events[spec.click];
  const click =
    clickEvent !== undefined && typeof clickEvent !== 'number' && startSec !== null
      ? { frame: Math.round((clickEvent.sec - startSec) * FPS), x: clickEvent.x, y: clickEvent.y }
      : null;
  const punch = click === null ? 0 : easeOut(clamp01((frame - click.frame) / PUNCH_FRAMES));
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.025], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = drift * (1 + PUNCH * punch);
  const origin = click === null ? `${WIDTH / 2}px ${HEIGHT / 2}px` : `${click.x}px ${click.y}px`;
  const ring = click === null ? -1 : (frame - click.frame) / RING_FRAMES;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: origin }}>
        {clip.exists && startSec !== null ? (
          <OffthreadVideo src={staticFile(CLIP_FILES[spec.clip])} startFrom={Math.round(startSec * FPS)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Placeholder text={placeholder} file={CLIP_FILES[spec.clip]} />
        )}
        {click !== null && ring >= 0 && ring <= 1 && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: click.x - (40 + 130 * easeOut(ring)) / 2,
              top: click.y - (40 + 130 * easeOut(ring)) / 2,
              width: 40 + 130 * easeOut(ring),
              height: 40 + 130 * easeOut(ring),
              borderRadius: 999,
              border: `5px solid ${theme.accent}`,
              opacity: 0.9 * (1 - ring),
            }}
          />
        )}
      </AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};

/** "Sow around May 28": a paper band slides down over the top of the frame, the words land one by one. */
export const SowBand: React.FC<{ readonly text: string; readonly from: number }> = ({ text, from }) => {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const local = frame - from;
  const words = text.split(' ');
  const bandIn = easeOut(clamp01(local / 8));
  const underline = easeOut(clamp01((local - 16) / 10));
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 176,
        transform: `translateY(${(1 - bandIn) * -176}px)`,
        backgroundColor: 'rgba(251, 250, 247, 0.97)',
        borderBottom: `4px solid ${theme.accent}`,
        boxShadow: '0 10px 30px rgba(20, 20, 20, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 26,
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: 90,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1,
        color: theme.ink,
        whiteSpace: 'nowrap',
      }}
    >
      {words.map((word, index) => {
        const wordIn = easeOut(clamp01((local - 4 - index * 4) / 7));
        const isDate = index >= words.length - 2;
        return (
          <span
            key={`${word}-${index}`}
            style={{
              position: 'relative',
              display: 'inline-block',
              opacity: wordIn,
              transform: `translateY(${(1 - wordIn) * 34}px)`,
              color: isDate ? theme.accent : theme.ink,
            }}
          >
            {word}
            {isDate && index === words.length - 1 && (
              <span aria-hidden="true" style={{ position: 'absolute', left: '-140%', right: 0, bottom: -10, height: 8, backgroundColor: theme.accent, transformOrigin: 'left', transform: `scaleX(${underline})` }} />
            )}
          </span>
        );
      })}
    </div>
  );
};
