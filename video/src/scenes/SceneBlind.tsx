/**
 * "Yet sowing is still decided almost blind." Kinetic: "When to sow?" rises; under it a sowing calendar (April to June,
 * a tick per day, months marked) where a brick-red pin with a question mark hops from date to date, leaving hollow
 * marks where it hesitated. On "almost blind" (public/words.json) the calendar blurs out and the words stamp onto it.
 * Pure motion graphics, no data: the strip is a plain calendar, the hops are not dates anyone chose.
 */
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { clamp01, easeInOut, easeOut } from '../lib/anim';
import { wordFrame } from '../lib/words';
import { BLIND_LINE_INDEX, TEXT, scene } from '../script';
import { fonts, theme } from '../theme';

const STRIP_LEFT = 360;
const STRIP_W = 1200;
const STRIP_Y = 600;
/** April 1 → June 30. */
const DAYS = 91;
const MONTH_START = [0, 30, 61];
/** Where the pin hesitates (share of the strip) and from which frame. */
const HOPS: readonly { readonly at: number; readonly x: number }[] = [
  { at: 4, x: 0.5 },
  { at: 14, x: 0.24 },
  { at: 24, x: 0.71 },
  { at: 33, x: 0.38 },
];

function pinX(frame: number): number {
  let x = HOPS[0]?.x ?? 0.5;
  for (let i = 1; i < HOPS.length; i += 1) {
    const hop = HOPS[i];
    const previous = HOPS[i - 1];
    if (hop === undefined || previous === undefined) continue;
    x = previous.x + (hop.x - previous.x) * easeInOut(clamp01((frame - hop.at) / 7));
    if (frame < hop.at + 7) break;
  }
  return STRIP_LEFT + x * STRIP_W;
}

export const SceneBlind: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const start = scene('blind').from;
  const blindAt = wordFrame(assets, BLIND_LINE_INDEX, 'almost', start + 44) - start;
  const blur = easeOut(clamp01((frame - blindAt) / 10));
  const stamp = easeOut(clamp01((frame - blindAt - 3) / 7));
  const shakeT = frame - blindAt - 9;
  const shake = shakeT >= 0 && shakeT < 7 ? 6 * (1 - shakeT / 7) * Math.sin(shakeT * 2.9) : 0;
  const words = TEXT.blind.question.split(' ');
  const stripIn = easeOut(clamp01((frame - 2) / 10));
  const x = pinX(frame);
  // Each hop lifts the pin a little.
  const hopLift = HOPS.reduce((lift, hop) => {
    const t = (frame - hop.at) / 7;
    return t > 0 && t < 1 ? Math.max(lift, Math.sin(Math.PI * t) * 34) : lift;
  }, 0);
  const visited = HOPS.filter((hop, index) => index < HOPS.length - 1 && frame >= (HOPS[index + 1]?.at ?? 0));

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, transform: `translate(${shake}px, ${shake * 0.4}px)` }}>
      <div style={{ position: 'absolute', top: 190, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 30, fontFamily: fonts.display, fontSize: 104, fontWeight: 500, letterSpacing: '-0.015em', color: theme.ink }}>
        {words.map((word, index) => {
          const rise = easeOut(clamp01((frame - index * 3) / 8));
          return (
            <span key={`${word}-${index}`} style={{ display: 'inline-block', opacity: rise * (1 - 0.55 * blur), transform: `translateY(${(1 - rise) * 40}px)`, color: index === words.length - 1 ? theme.accent : theme.ink }}>
              {word}
            </span>
          );
        })}
      </div>

      <div style={{ position: 'absolute', inset: 0, opacity: stripIn * (1 - 0.6 * blur), filter: blur > 0.02 ? `blur(${(blur * 12).toFixed(1)}px)` : undefined }}>
        <svg aria-hidden="true" width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <line x1={STRIP_LEFT} y1={STRIP_Y} x2={STRIP_LEFT + STRIP_W * stripIn} y2={STRIP_Y} stroke={theme.ink} strokeWidth={4} strokeLinecap="round" />
          {Array.from({ length: DAYS }, (_, day) => {
            const tx = STRIP_LEFT + (day / (DAYS - 1)) * STRIP_W;
            const major = MONTH_START.includes(day);
            const show = clamp01((frame - 2 - day * 0.12) / 4);
            return <line key={day} x1={tx} y1={STRIP_Y} x2={tx} y2={STRIP_Y + (major ? 34 : 14) * show} stroke={major ? theme.ink : theme.ink2} strokeWidth={major ? 4 : 2} />;
          })}
          {visited.map((hop) => (
            <circle key={hop.at} cx={STRIP_LEFT + hop.x * STRIP_W} cy={STRIP_Y} r={11} fill={theme.paper} stroke={theme.ink2} strokeWidth={3} strokeDasharray="5 4" />
          ))}
          {/* The pin: a stem down to the date, a head holding the question mark. */}
          <line x1={x} y1={STRIP_Y - 8} x2={x} y2={STRIP_Y - 92 - hopLift} stroke={theme.accent} strokeWidth={5} strokeLinecap="round" />
          <circle cx={x} cy={STRIP_Y - 130 - hopLift} r={40} fill={theme.accent} />
          <text x={x} y={STRIP_Y - 112 - hopLift} textAnchor="middle" fontFamily="'Fraunces', Georgia, serif" fontSize={54} fontWeight={600} fill={theme.card}>
            ?
          </text>
        </svg>
        {TEXT.blind.months.map((month, index) => (
          <div
            key={month}
            style={{ position: 'absolute', top: STRIP_Y + 50, left: STRIP_LEFT + ((MONTH_START[index] ?? 0) / (DAYS - 1)) * STRIP_W, fontFamily: fonts.body, fontSize: 30, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.ink2, opacity: stripIn }}
          >
            {month}
          </div>
        ))}
      </div>

      {frame >= blindAt + 3 && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: STRIP_Y - 110,
            textAlign: 'center',
            fontFamily: fonts.display,
            fontSize: 150,
            fontWeight: 600,
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
            color: theme.accent,
            opacity: stamp,
            transform: `rotate(-3deg) scale(${1.5 - 0.5 * stamp})`,
          }}
        >
          {TEXT.blind.stamp}
        </div>
      )}
    </AbsoluteFill>
  );
};
