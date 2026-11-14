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
import { CLIP_CUTS, type ClipCut, FPS, HEIGHT, WIDTH } from '../script';
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
  const spec: ClipCut = CLIP_CUTS[cut];
  const clip = assets[spec.clip];
  const anchor = eventSec(clip.events[spec.anchor]);
  const startSec = anchor === null ? null : Math.max(0, anchor - spec.lead);
  /** An event as a frame of this scene with its point, when it has one. */
  const at = (name: string | null | undefined): { readonly frame: number; readonly x: number; readonly y: number; readonly w: number } | null => {
    const event = name === null || name === undefined ? undefined : clip.events[name];
    if (event === undefined || typeof event === 'number' || startSec === null) return null;
    return { frame: Math.round((event.sec - startSec) * FPS), x: event.x, y: event.y, w: event.w ?? 0 };
  };
  const line = at(spec.underline);
  const lineDraw = line === null ? 0 : easeOut(clamp01((frame - line.frame - 4) / 10));
  const punchAt = at(spec.punch);
  const punch = punchAt === null ? 0 : easeOut(clamp01((frame - punchAt.frame) / PUNCH_FRAMES));
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.025], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scale = drift * (1 + PUNCH * punch);
  const origin = punchAt === null ? `${WIDTH / 2}px ${HEIGHT / 2}px` : `${punchAt.x}px ${punchAt.y}px`;
  const rings = spec.rings.map((name) => at(name)).filter((ring): ring is NonNullable<typeof ring> => ring !== null);
  const view = spec.view;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, overflow: 'hidden' }}>
      <AbsoluteFill style={view === undefined ? {} : { transform: `scale(${view.scale})`, transformOrigin: `${view.x}px ${view.y}px` }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: origin }}>
        {clip.exists && startSec !== null ? (
          <OffthreadVideo src={staticFile(CLIP_FILES[spec.clip])} startFrom={Math.round(startSec * FPS)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Placeholder text={placeholder} file={CLIP_FILES[spec.clip]} />
        )}
        {rings.map((ring) => {
          const progress = (frame - ring.frame) / RING_FRAMES;
          if (progress < 0 || progress > 1) return null;
          const size = 40 + 130 * easeOut(progress);
          return (
            <div
              key={`${ring.frame}-${ring.x}`}
              aria-hidden="true"
              style={{ position: 'absolute', left: ring.x - size / 2, top: ring.y - size / 2, width: size, height: size, borderRadius: 999, border: `5px solid ${theme.accent}`, opacity: 0.9 * (1 - progress) }}
            />
          );
        })}
        {line !== null && line.w > 0 && lineDraw > 0 && (
          <div
            aria-hidden="true"
            style={{ position: 'absolute', left: line.x - line.w / 2 - 6, top: line.y + 17, width: line.w + 12, height: 5, borderRadius: 3, backgroundColor: theme.accent, transformOrigin: 'left', transform: `scaleX(${lineDraw})` }}
          />
        )}
      </AbsoluteFill>
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
