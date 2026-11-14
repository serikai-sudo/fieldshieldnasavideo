/**
 * "Next: every rainfed grain belt on Earth." The wordmark, then the line itself set big, word by word on the voice
 * (public/words.json), "Earth" in brick red with a swipe under it, and the live address from the start. Above the
 * words the silhouette of Kazakhstan with the Kostanay field (src/data/belt-outline.ts, as in the problem scene) draws
 * itself, and brick-red rings spread from it to the edges of the frame — this belt first, then outward. This line has no
 * subtitle: the scene is its subtitle.
 */
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { Wordmark } from '../components/Wordmark';
import { KAZAKHSTAN_RINGS } from '../data/belt-outline';
import { clamp01, easeOut, fadeIn } from '../lib/anim';
import { boxOf, projectionFor, ringPath } from '../lib/geo';
import { wordFrame } from '../lib/words';
import { CLOSE_LINE_INDEX, LINES, TEXT, scene } from '../script';
import { fonts, theme } from '../theme';

const MAP_W = 380;
const MAP_H = 160;
const PROJECTION = projectionFor(boxOf(KAZAKHSTAN_RINGS), MAP_W, MAP_H);
const MAP_PATHS = KAZAKHSTAN_RINGS.map((ring) => ringPath(ring, PROJECTION));
const MAP_LENGTH = 3000;
/** Kostanay demo field, as in the app's fields.ts. */
const [FIELD_X, FIELD_Y] = PROJECTION.project(63.6252, 53.214);
const MAP_TOP = 222;
const CENTER = { x: 960 - MAP_W / 2 + FIELD_X, y: MAP_TOP + FIELD_Y } as const;
const RIPPLE_FRAMES = 34;

export const SceneClose: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const start = scene('close').from;
  const cue = (LINES[CLOSE_LINE_INDEX]?.from ?? start) - start;
  const words = TEXT.close.line.split(' ');
  const wordAt = words.map((word, index) => wordFrame(assets, CLOSE_LINE_INDEX, word.toLowerCase(), start + cue + 12 + index * 6, 3) - start);
  const markIn = easeOut(fadeIn(frame, 0, 10));
  const leadIn = easeOut(fadeIn(frame, cue, 6));
  const lastAt = wordAt[wordAt.length - 1] ?? 50;
  const swipe = easeOut(clamp01((frame - lastAt - 4) / 10));
  const urlIn = easeOut(fadeIn(frame, 6, 10));
  const beltDraw = easeOut(clamp01((frame - 2) / 30));
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
          <circle cx={FIELD_X} cy={FIELD_Y} r={7 * beltDraw} fill={theme.accent} />
        </g>
      </svg>
      <div style={{ position: 'absolute', top: 110, opacity: markIn, transform: `translateY(${(1 - markIn) * -16}px)` }}>
        <Wordmark size={52} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, marginTop: 150 }}>
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
