/**
 * A cut of a real recording of the live platform, anchored on a logged event (script.ts CLIP_CUTS, public/clips.json):
 * the anchor plays on its spoken word (`sync`) or `lead` seconds into the scene, so the picture says what the voice
 * says. On top of the recording, in its own pixels: a brick-red ring on each click, marks drawn round the elements the
 * voice names, rings rippling across a row of elements. The camera glides and zooms to each named element (never
 * showing past the recording's edge), over a slow push. Without the clip or its events, a labelled placeholder.
 */
import type React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { type Assets, CLIP_FILES, type ClipEvent, eventSec } from '../assets';
import { Marker } from '../components/Marker';
import { Placeholder } from '../components/Placeholder';
import { clamp01, easeInOut, easeOut } from '../lib/anim';
import { wordFrame } from '../lib/words';
import { CLIP_CUTS, type ClipCut, type Cue, FPS, HEIGHT, LINES, type SceneId, WIDTH, scene } from '../script';
import { theme } from '../theme';

type CutId = keyof typeof CLIP_CUTS;

const RING_FRAMES = 18;
const MOVE_FRAMES = 16;
const RIPPLE_STAGGER = 3;

type Point = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

function pointOf(event: ClipEvent | undefined): Point | null {
  if (event === undefined || typeof event === 'number') return null;
  return { x: event.x, y: event.y, w: event.w ?? 0, h: event.h ?? 0 };
}

export const SceneClip: React.FC<{ readonly assets: Assets; readonly cut: CutId; readonly placeholder: string; readonly children?: React.ReactNode }> = ({
  assets,
  cut,
  placeholder,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const spec: ClipCut = CLIP_CUTS[cut];
  const sceneId: SceneId = cut;
  const start = scene(sceneId).from;
  const clip = assets[spec.clip];
  const anchor = eventSec(clip.events[spec.anchor]);
  const syncAt = spec.sync === undefined ? null : (wordFrame(assets, spec.sync.line, spec.sync.word, Number.NaN, 0) - start) / FPS;
  const anchorAtSec = syncAt !== null && Number.isFinite(syncAt) ? syncAt : spec.lead;
  const startSec = anchor === null ? null : Math.max(0, anchor - anchorAtSec);

  /** The scene frame of a cue: an event of the recording, or a spoken word. */
  const frameOf = (when: Cue): number | null => {
    if ('event' in when) {
      const sec = eventSec(clip.events[when.event]);
      return sec === null || startSec === null ? null : Math.round((sec - startSec) * FPS);
    }
    const fallback = (LINES[when.line]?.from ?? start) + 20;
    return wordFrame(assets, when.line, when.word, fallback) - start;
  };

  // Camera: a chain of eased moves; each glides the target toward the centre and zooms, clamped to the recording.
  let scale = 1;
  let focusX = WIDTH / 2;
  let focusY = HEIGHT / 2;
  for (const move of spec.camera) {
    const at = frameOf(move.when);
    const target = pointOf(clip.events[move.target]);
    if (at === null || target === null) continue;
    const p = easeInOut(clamp01((frame - at) / MOVE_FRAMES));
    scale += (move.scale - scale) * p;
    focusX += (target.x - focusX) * p;
    focusY += (target.y - focusY) * p;
  }
  const drift = interpolate(frame, [0, durationInFrames], [1, 1.02], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const s = scale * drift;
  // The focus point moves a third of the way to the centre; the frame never shows past the recording.
  const anchorX = focusX + (WIDTH / 2 - focusX) * 0.35;
  const anchorY = focusY + (HEIGHT / 2 - focusY) * 0.35;
  const tx = Math.min(0, Math.max(WIDTH - s * WIDTH, anchorX - s * focusX));
  const ty = Math.min(0, Math.max(HEIGHT - s * HEIGHT, anchorY - s * focusY));

  const rings = spec.rings
    .map((name) => ({ at: frameOf({ event: name }), point: pointOf(clip.events[name]) }))
    .filter((ring): ring is { at: number; point: Point } => ring.at !== null && ring.point !== null);
  const rippleSpec = spec.ripples;
  const rippleAt = rippleSpec === undefined ? null : frameOf(rippleSpec.when);
  const ripples =
    rippleSpec === undefined || rippleAt === null
      ? []
      : rippleSpec.targets
          .map((name, index) => ({ at: rippleAt + index * RIPPLE_STAGGER, point: pointOf(clip.events[name]) }))
          .filter((ripple): ripple is { at: number; point: Point } => ripple.point !== null);
  const marks = spec.marks
    .map((mark) => ({ mark, at: frameOf(mark.when), point: pointOf(clip.events[mark.target]) }))
    .filter((entry): entry is { mark: (typeof spec.marks)[number]; at: number; point: Point } => entry.at !== null && entry.point !== null);
  const view = spec.view;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, overflow: 'hidden' }}>
      <AbsoluteFill style={view === undefined ? {} : { transform: `scale(${view.scale})`, transformOrigin: `${view.x}px ${view.y}px` }}>
        <AbsoluteFill style={{ transform: `translate(${tx}px, ${ty}px) scale(${s})`, transformOrigin: '0 0' }}>
          {clip.exists && startSec !== null ? (
            <OffthreadVideo src={staticFile(CLIP_FILES[spec.clip])} startFrom={Math.round(startSec * FPS)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Placeholder text={placeholder} file={CLIP_FILES[spec.clip]} />
          )}
          {[...rings.map((ring) => ({ ...ring, big: true })), ...ripples.map((ripple) => ({ ...ripple, big: false }))].map((ring) => {
            const progress = (frame - ring.at) / RING_FRAMES;
            if (progress < 0 || progress > 1) return null;
            const size = ring.big ? 40 + 130 * easeOut(progress) : Math.max(ring.point.w, 60) * (0.9 + 0.5 * easeOut(progress));
            const height = ring.big ? size : ring.point.h * (1.2 + 0.6 * easeOut(progress));
            return (
              <div
                key={`${ring.at}-${ring.point.x}`}
                aria-hidden="true"
                style={{ position: 'absolute', left: ring.point.x - size / 2, top: ring.point.y - height / 2, width: size, height, borderRadius: 999, border: `${ring.big ? 5 : 4}px solid ${theme.accent}`, opacity: 0.9 * (1 - progress) }}
              />
            );
          })}
          {marks.map(({ mark, at, point }) => (
            <Marker key={`${mark.target}-${mark.kind}`} kind={mark.kind} x={point.x} y={point.y} w={point.w} h={point.h || 22} from={at} />
          ))}
        </AbsoluteFill>
      </AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};

/** "Sow around May 28": a paper band that drops in from the top, the words landing one by one, the date in accent. */
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
          <span key={`${word}-${index}`} style={{ position: 'relative', display: 'inline-block', opacity: wordIn, transform: `translateY(${(1 - wordIn) * 34}px)`, color: isDate ? theme.accent : theme.ink }}>
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

/**
 * A full-frame kinetic question (paper, Fraunces, the last word in accent) that covers the start of a clip scene and
 * whips away to the left at `until` (scene frames), revealing the recording under it.
 */
export const QuestionInsert: React.FC<{ readonly text: string; readonly until: number }> = ({ text, until }) => {
  const frame = useCurrentFrame();
  const leave = easeInOut(clamp01((frame - until) / 7));
  if (leave >= 1) return null;
  const words = text.split(' ');
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center', transform: `translateX(${-leave * 2000}px)`, filter: leave > 0.02 ? `blur(${(leave * 16).toFixed(1)}px)` : undefined }}>
      <div style={{ display: 'flex', gap: 34, fontFamily: "'Fraunces', Georgia, serif", fontSize: 150, fontWeight: 500, letterSpacing: '-0.02em', color: theme.ink }}>
        {words.map((word, index) => {
          const rise = easeOut(clamp01((frame - 2 - index * 4) / 8));
          return (
            <span key={`${word}-${index}`} style={{ display: 'inline-block', opacity: rise, transform: `translateY(${(1 - rise) * 60}px) scale(${0.9 + 0.1 * rise})`, color: index === words.length - 1 ? theme.accent : theme.ink }}>
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
