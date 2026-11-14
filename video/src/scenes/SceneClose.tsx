/**
 * "For now Northern Kazakhstan, next: every rainfed grain belt on Earth." The wordmark; the silhouette of Kazakhstan
 * draws itself and, on "Northern Kazakhstan", the app's validated northern belt (src/data/belt-outline.ts CORE_RING, the
 * core of the map's dashed belt) appears dashed in brick red with the Kostanay field, labelled "for now". Then the line set big,
 * word by word on the voice (public/words.json), "Earth" in brick red with a swipe under it, while brick-red rings spread
 * from the belt to the edges of the frame — this belt first, then outward. The live address throughout. This line has no
 * subtitle: the scene is its subtitle.
 */
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { Wordmark } from '../components/Wordmark';
import { CORE_RING, KAZAKHSTAN_RINGS } from '../data/belt-outline';
import { clamp01, easeOut, fadeIn } from '../lib/anim';
import { boxOf, projectionFor, ringPath } from '../lib/geo';
import { wordFrame } from '../lib/words';
import { CLOSE_LINE_INDEX, LINES, TEXT, scene } from '../script';
import { fonts, theme } from '../theme';

const MAP_W = 540;
const MAP_H = 225;
const PROJECTION = projectionFor(boxOf(KAZAKHSTAN_RINGS), MAP_W, MAP_H);
const MAP_PATHS = KAZAKHSTAN_RINGS.map((ring) => ringPath(ring, PROJECTION));
const CORE_PATH = ringPath(CORE_RING, PROJECTION);
const MAP_LENGTH = 4000;
/** Kostanay demo field, as in the app's fields.ts. */
const [FIELD_X, FIELD_Y] = PROJECTION.project(63.6252, 53.214);
const MAP_TOP = 150;
const CENTER = { x: 960 - MAP_W / 2 + FIELD_X, y: MAP_TOP + FIELD_Y } as const;
const RIPPLE_FRAMES = 34;

export const SceneClose: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const start = scene('close').from;
  const cue = (LINES[CLOSE_LINE_INDEX]?.from ?? start) - start;
  const words = TEXT.close.line.split(' ');
  const wordAt = words.map((word, index) => wordFrame(assets, CLOSE_LINE_INDEX, word.toLowerCase(), start + cue + 12 + index * 6, 3) - start);
  const markIn = easeOut(fadeIn(frame, 0, 10));
  const leadIn = easeOut(fadeIn(frame, wordFrame(assets, CLOSE_LINE_INDEX, 'next', start + cue + 46) - start, 6));
  const coreIn = easeOut(fadeIn(frame, wordFrame(assets, CLOSE_LINE_INDEX, 'northern', start + cue + 16) - start, 10));
  const lastAt = wordAt[wordAt.length - 1] ?? 50;
  const swipe = easeOut(clamp01((frame - lastAt - 4) / 10));
  const urlIn = easeOut(fadeIn(frame, 6, 10));
  const beltDraw = easeOut(clamp01((frame - 1) / 18));
  const firstAt = wordAt[0] ?? 16;
  const ripples = [firstAt, firstAt + 11, firstAt + 22, lastAt];
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center' }}>
      <svg aria-hidden="true" width={1920} height={1080} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {ripples.map((at, index) => {
          const t = (frame - at) / RIPPLE_FRAMES;
          if (t < 0 || t > 1) return null;
          return <circle key={`${at}-${index}`} cx={CENTER.x} cy={CENTER.y} r={20 + 1400 * easeOut(t)} fill="none" stroke={theme.accent} strokeWidth={index === ripples.length - 1 ? 6 : 4} opacity={0.45 * (1 - t)} />;
        })}
        <g transform={`translate(${960 - MAP_W / 2} ${MAP_TOP})`}>
          {MAP_PATHS.map((d) => (
            <path key={d.slice(0, 24)} d={d} fill={theme.line2} fillOpacity={beltDraw} stroke={theme.ink2} strokeWidth={2} strokeLinejoin="round" strokeDasharray={MAP_LENGTH} strokeDashoffset={MAP_LENGTH * (1 - beltDraw)} />
          ))}
          <path d={CORE_PATH} fill={theme.accentTint} stroke={theme.accent} strokeWidth={4} strokeDasharray="10 7" strokeLinejoin="round" opacity={coreIn} />
          <circle cx={FIELD_X} cy={FIELD_Y} r={8 * beltDraw} fill={theme.card} stroke={theme.ink} strokeWidth={3} />
        </g>
      </svg>
      <div style={{ position: 'absolute', top: 62, opacity: markIn, transform: `translateY(${(1 - markIn) * -16}px)` }}>
        <Wordmark size={46} />
      </div>
      <div style={{ position: 'absolute', top: MAP_TOP + MAP_H + 16, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.body, fontSize: 26, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.ink2, opacity: coreIn, transform: `translateY(${(1 - coreIn) * 10}px)` }}>
        {TEXT.close.region}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginTop: 250 }}>
        <div style={{ fontFamily: fonts.body, fontSize: 34, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.accent, opacity: leadIn }}>
          {TEXT.close.lead}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 30, rowGap: 6, width: 1500, fontFamily: fonts.display, fontSize: 118, fontWeight: 500, lineHeight: 1.08, letterSpacing: '-0.015em', color: theme.ink }}>
          {words.map((word, index) => {
            // "every rainfed grain belt / on Earth": the break sits before the last two words.
            const lineBreak = index === words.length - 2 ? <div key="break" style={{ flexBasis: '100%', height: 0 }} /> : null;
            const at = wordAt[index] ?? 0;
            const rise = easeOut(clamp01((frame - at) / 7));
            const isLast = index === words.length - 1;
            return [
              lineBreak,
              <span key={`${word}-${index}`} style={{ position: 'relative', display: 'inline-block', overflow: 'visible', opacity: rise, transform: `translateY(${(1 - rise) * 40}px)`, color: isLast ? theme.accent : theme.ink }}>
                {word}
                {isLast && <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: -6, height: 9, backgroundColor: theme.accent, transformOrigin: 'left', transform: `scaleX(${swipe})` }} />}
              </span>,
            ];
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 120, padding: '14px 34px', borderRadius: 999, border: `2px solid ${theme.ink}`, backgroundColor: theme.card, fontFamily: fonts.body, fontSize: 38, fontWeight: 600, color: theme.ink, opacity: urlIn, transform: `translateY(${(1 - urlIn) * 20}px)` }}>
        {TEXT.close.url}
      </div>
    </AbsoluteFill>
  );
};
