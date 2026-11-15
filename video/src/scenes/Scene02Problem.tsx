/**
 * "The problem: in 2012 drought cut our wheat harvest in half." The statement at the top, the silhouette of Northern
 * Kazakhstan (ink-2) on the left, and on the right a two-bar chart — the 2011 harvest, then the 2012 bar (on "2012")
 * collapsing from that height to its own while the voice says "cut our wheat harvest", landing with a brick-red flash
 * and a shake on "in half", where a measured drop (a dashed guide at the 2011 height and an arrow down, "half") draws.
 * Only the two recorded yields appear: 16.61 and 7.93 c/ha (FAOSTAT); the 2012 figure fades in after the collapse, so
 * no intermediate number is ever on screen. The beats follow the voice's word timings (public/words.json).
 */
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { Chip } from '../components/Chip';
import { CORE_RING, KAZAKHSTAN_RINGS } from '../data/belt-outline';
import { clamp01, easeInOut, easeOut, fadeIn } from '../lib/anim';
import { boxOf, projectionFor, ringPath } from '../lib/geo';
import { wordFrame } from '../lib/words';
import { PROBLEM_LINE_INDEX, TEXT, scene } from '../script';
import { fonts, theme } from '../theme';

/** Kostanay demo field, as in the app's fields.ts (lat 53.214, lon 63.6252): the dot on the silhouette. */
const KOSTANAY = { lon: 63.6252, lat: 53.214 } as const;

const MAP_W = 800;
const MAP_H = 330;
const projection = projectionFor(boxOf(KAZAKHSTAN_RINGS), MAP_W, MAP_H);
const KZ_PATHS = KAZAKHSTAN_RINGS.map((ring) => ringPath(ring, projection));
const CORE_PATH = ringPath(CORE_RING, projection);
const [KOSTANAY_X, KOSTANAY_Y] = projection.project(KOSTANAY.lon, KOSTANAY.lat);

/* Chart geometry. */
const BASELINE_Y = 820;
const MAX_BAR_H = 420;
const BAR_W = 190;
const CHART_X = 1150;
const BAR_GAP = 150;
/** The measured drop's arrow, just right of the 2012 bar. */
const DROP_X = CHART_X + 2 * BAR_W + BAR_GAP + 34;
const MAX_VALUE = Math.max(...TEXT.problem.bars.map((bar) => bar.value));

function barHeight(value: number): number {
  return (value / MAX_VALUE) * MAX_BAR_H;
}

export const Scene02Problem: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const start = scene('problem').from;
  const beat = (word: string, fallback: number, pick: 'first' | 'last' = 'first') => wordFrame(assets, PROBLEM_LINE_INDEX, word, start + fallback, 2, pick) - start;
  /** The 2012 bar shows up on "2012", falls during "cut our wheat harvest", and lands on "in half". */
  const APPEAR = beat('2012', 30);
  const FALL = beat('cut', 52);
  const HIT = Math.max(FALL + 12, beat('in', 98, 'last'));
  const sceneIn = fadeIn(frame, 0, 8);
  const headIn = fadeIn(frame, 2, 10);
  const mapIn = fadeIn(frame, 4, 12);
  const coreIn = fadeIn(frame, 10, 12);
  const dotIn = fadeIn(frame, 16, 8);

  const good = TEXT.problem.bars[0];
  const drought = TEXT.problem.bars[1];
  if (good === undefined || drought === undefined) return null;

  const goodRise = easeOut(fadeIn(frame, 6, 16));
  const collapse = easeInOut(clamp01((frame - FALL) / (HIT - FALL)));
  const droughtVisible = frame >= APPEAR;
  const droughtH = (barHeight(good.value) + (barHeight(drought.value) - barHeight(good.value)) * collapse) * easeOut(clamp01((frame - APPEAR) / 6));
  const droughtNumberIn = fadeIn(frame, HIT, 6);
  const chipIn = fadeIn(frame, HIT + 8, 8);
  // The drop, measured: a dashed guide at the 2011 height over the 2012 bar, then an arrow down to its top.
  const guide = easeOut(clamp01((frame - HIT - 2) / 8));
  const arrow = easeOut(clamp01((frame - HIT - 6) / 9));
  // The hit: as the 2012 bar lands, a brick-red flash and a short shake (edit-style emphasis).
  const flash = frame >= HIT && frame < HIT + 6 ? 0.16 * (1 - (frame - HIT) / 6) : 0;
  const shakeT = frame - HIT;
  const shakeAmp = shakeT >= 0 && shakeT < 8 ? 7 * (1 - shakeT / 8) : 0;
  const shakeX = shakeAmp * Math.sin(shakeT * 2.7);
  const shakeY = shakeAmp * 0.6 * Math.cos(shakeT * 3.1);

  const bars = [
    { year: good.year, h: barHeight(good.value) * goodRise, color: theme.ink2, number: good.value.toFixed(2), numberOpacity: fadeIn(frame, 20, 6), x: CHART_X },
    { year: drought.year, h: droughtVisible ? droughtH : 0, color: theme.risk.high, number: drought.value.toFixed(2), numberOpacity: droughtNumberIn, x: CHART_X + BAR_W + BAR_GAP },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, opacity: sceneIn, transform: `translate(${shakeX}px, ${shakeY}px)` }}>
      {/* The statement. */}
      <div
        style={{
          position: 'absolute',
          left: 96,
          right: 96,
          top: 104,
          fontFamily: fonts.display,
          fontSize: 56,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
          color: theme.ink,
          opacity: headIn,
          transform: `translateY(${(1 - headIn) * 12}px)`,
        }}
      >
        {TEXT.problem.label.split(TEXT.problem.accent)[0]}
        <span style={{ color: theme.accent }}>{TEXT.problem.accent}</span>
      </div>

      {/* The silhouette: Kazakhstan's spring-wheat north, the validated core outlined, the Kostanay field as a dot. */}
      <div style={{ position: 'absolute', left: 96, top: 400, opacity: mapIn }}>
        <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true">
          {KZ_PATHS.map((d) => (
            <path key={d.slice(0, 24)} d={d} fill={theme.line2} stroke={theme.ink2} strokeWidth={2} strokeLinejoin="round" />
          ))}
          <path d={CORE_PATH} fill="none" stroke={theme.ink2} strokeWidth={3} strokeLinejoin="round" opacity={coreIn} />
          <circle cx={KOSTANAY_X} cy={KOSTANAY_Y} r={9 * dotIn} fill={theme.ink} />
          <circle cx={KOSTANAY_X} cy={KOSTANAY_Y} r={18 * dotIn} fill="none" stroke={theme.ink} strokeWidth={1.5} opacity={0.5 * dotIn} />
        </svg>
        <div style={{ marginTop: 20, fontFamily: fonts.body, fontSize: 24, color: theme.ink2, letterSpacing: '0.02em', opacity: coreIn }}>{TEXT.problem.region}</div>
      </div>

      {/* The chart. */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 }}>
        {bars.map((bar) => (
          <div key={bar.year}>
            <div
              style={{
                position: 'absolute',
                left: bar.x,
                top: BASELINE_Y - bar.h,
                width: BAR_W,
                height: bar.h,
                backgroundColor: bar.color,
                borderRadius: '8px 8px 0 0',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: bar.x - 40,
                width: BAR_W + 80,
                top: BASELINE_Y - bar.h - 86,
                textAlign: 'center',
                fontFamily: fonts.display,
                fontSize: 60,
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                color: theme.ink,
                opacity: bar.numberOpacity,
              }}
            >
              {bar.number}
              <span style={{ fontFamily: fonts.body, fontSize: 24, fontWeight: 500, color: theme.ink2, marginLeft: 10 }}>{TEXT.problem.unit}</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: bar.x,
                width: BAR_W,
                top: BASELINE_Y + 18,
                textAlign: 'center',
                fontFamily: fonts.body,
                fontSize: 28,
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                color: theme.ink2,
              }}
            >
              {bar.year}
            </div>
          </div>
        ))}
        <div style={{ position: 'absolute', left: CHART_X - 60, width: BAR_W * 2 + BAR_GAP + 120, top: BASELINE_Y, height: 2, backgroundColor: theme.hairline }} />
        {/* The drop, measured: the 2011 height carried over the 2012 bar (dashed), an arrow down to the 2012 top. */}
        {guide > 0 && (
          <svg aria-hidden="true" width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <line x1={CHART_X + BAR_W} y1={BASELINE_Y - barHeight(good.value)} x2={CHART_X + BAR_W + (BAR_GAP + BAR_W + 60) * guide} y2={BASELINE_Y - barHeight(good.value)} stroke={theme.ink2} strokeWidth={3} strokeDasharray="12 10" />
            <line x1={DROP_X} y1={BASELINE_Y - barHeight(good.value)} x2={DROP_X} y2={BASELINE_Y - barHeight(good.value) + (barHeight(good.value) - barHeight(drought.value) - 14) * arrow} stroke={theme.accent} strokeWidth={6} strokeLinecap="round" />
            {arrow > 0.9 && <path d={`M ${DROP_X - 16} ${BASELINE_Y - barHeight(drought.value) - 22} L ${DROP_X} ${BASELINE_Y - barHeight(drought.value) - 2} L ${DROP_X + 16} ${BASELINE_Y - barHeight(drought.value) - 22}`} fill="none" stroke={theme.accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />}
          </svg>
        )}
        <div
          style={{
            position: 'absolute',
            left: DROP_X + 22,
            top: BASELINE_Y - (barHeight(good.value) + barHeight(drought.value)) / 2 - 36,
            fontFamily: fonts.display,
            fontSize: 58,
            fontWeight: 600,
            fontStyle: 'italic',
            color: theme.accent,
            opacity: arrow,
            transform: `translateX(${(1 - arrow) * 20}px)`,
          }}
        >
          {TEXT.problem.drop}
        </div>
        {/* The source, under the year labels so it never sits on one. */}
        <div style={{ position: 'absolute', left: CHART_X - 60, top: BASELINE_Y + 70, width: BAR_W * 2 + BAR_GAP + 120, display: 'flex', justifyContent: 'flex-end', opacity: chipIn }}>
          <Chip label={`Source · ${TEXT.problem.source}`} />
        </div>
      </div>
      {flash > 0 && <AbsoluteFill style={{ backgroundColor: theme.accent, opacity: flash }} />}
    </AbsoluteFill>
  );
};
