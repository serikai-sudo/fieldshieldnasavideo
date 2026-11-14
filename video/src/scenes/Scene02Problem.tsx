/**
 * S2 · 2–4 s: the statement at the top, the silhouette of Northern Kazakhstan (ink-2) on the left, and on the right a
 * two-bar chart — the 2011 harvest, then the 2012 bar collapsing from that height to its own. Only the two recorded
 * yields appear: 16.61 and 7.93 c/ha (FAOSTAT). The 2012 figure fades in after the collapse, so no intermediate number
 * is ever on screen.
 */
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Chip } from '../components/Chip';
import { CORE_RING, KAZAKHSTAN_RINGS } from '../data/belt-outline';
import { easeInOut, easeOut, fadeIn } from '../lib/anim';
import { boxOf, projectionFor, ringPath } from '../lib/geo';
import { TEXT } from '../script';
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
const MAX_VALUE = Math.max(...TEXT.problem.bars.map((bar) => bar.value));

function barHeight(value: number): number {
  return (value / MAX_VALUE) * MAX_BAR_H;
}

export const Scene02Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneIn = fadeIn(frame, 0, 8);
  const headIn = fadeIn(frame, 2, 10);
  const mapIn = fadeIn(frame, 4, 12);
  const coreIn = fadeIn(frame, 10, 12);
  const dotIn = fadeIn(frame, 16, 8);

  const good = TEXT.problem.bars[0];
  const drought = TEXT.problem.bars[1];
  if (good === undefined || drought === undefined) return null;

  // 60-frame scene: 2011 rises 6–20; 2012 appears at the 2011 height on 22 and collapses to its own height over 24–42.
  const goodRise = easeOut(fadeIn(frame, 6, 14));
  const collapse = easeInOut(fadeIn(frame, 24, 18));
  const droughtVisible = frame >= 22;
  const droughtH = barHeight(good.value) + (barHeight(drought.value) - barHeight(good.value)) * collapse;
  const droughtNumberIn = fadeIn(frame, 42, 6);
  const chipIn = fadeIn(frame, 46, 8);

  const bars = [
    { year: good.year, h: barHeight(good.value) * goodRise, color: theme.ink2, number: good.value.toFixed(2), numberOpacity: fadeIn(frame, 18, 6), x: CHART_X },
    { year: drought.year, h: droughtVisible ? droughtH : 0, color: theme.risk.high, number: drought.value.toFixed(2), numberOpacity: droughtNumberIn, x: CHART_X + BAR_W + BAR_GAP },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, opacity: sceneIn }}>
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
        {TEXT.problem.label}
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
        {/* The source, under the year labels so it never sits on one. */}
        <div style={{ position: 'absolute', left: CHART_X - 60, top: BASELINE_Y + 70, width: BAR_W * 2 + BAR_GAP + 120, display: 'flex', justifyContent: 'flex-end', opacity: chipIn }}>
          <Chip label={`Source · ${TEXT.problem.source}`} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
