/**
 * "33 years back-tested; with heat, it holds out of sample." The real back-test card of the Confidence tab
 * (public/ui/backtest.png: ρ = −0.63, p < 0.001, worst years caught) under a brick-red eyebrow, then two rows that land
 * on the spoken words: water alone (ρ −0.63, misses 2012) and water + heat (ρ −0.66, catches 2012), stamped
 * "leave-one-out" on "out of sample". The rows come from the app repository's data/skill-heat.json (not yet on the live
 * site), so the source line under them says so. Fallback without the picture: the stamp line as text.
 */
import type React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { clamp01, easeOut, fadeIn } from '../lib/anim';
import { wordFrame } from '../lib/words';
import { BACKTEST_LINE_INDEX, LINES, TEXT, scene } from '../script';
import { fonts, radii, shadow, theme } from '../theme';

const SHOW_WIDTH = 1180;

const Row: React.FC<{ readonly row: (typeof TEXT.backtest.rows)[number]; readonly at: number; readonly stampAt: number | null }> = ({ row, at, stampAt }) => {
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const enter = easeOut(clamp01((frame - at) / 8));
  const pop = 1 + 0.05 * Math.sin(Math.PI * clamp01((frame - at) / 10));
  const stamp = stampAt === null ? 0 : easeOut(clamp01((frame - stampAt) / 7));
  const tone = row.strong ? theme.accent : theme.ink2;
  return (
    <div
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '440px 260px 300px',
        alignItems: 'center',
        columnGap: 24,
        padding: '18px 34px',
        width: 1180,
        boxSizing: 'border-box',
        backgroundColor: row.strong ? theme.accentTint : theme.card,
        border: `${row.strong ? 3 : 1}px solid ${row.strong ? theme.accent : theme.hairline}`,
        borderRadius: radii.cardSm,
        boxShadow: shadow.card,
        opacity: enter,
        transform: `translateY(${(1 - enter) * 30}px) scale(${pop})`,
      }}
    >
      <span style={{ fontFamily: fonts.body, fontSize: 36, fontWeight: 600, color: theme.ink }}>{row.label}</span>
      <span style={{ fontFamily: fonts.display, fontSize: 60, fontWeight: 500, color: tone, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{row.value}</span>
      <span style={{ fontFamily: fonts.body, fontSize: 32, fontWeight: 600, color: tone, justifySelf: 'end' }}>{row.note}</span>
      {stampAt !== null && frame >= stampAt && (
        <span
          style={{
            position: 'absolute',
            right: -26,
            top: -30,
            padding: '8px 18px',
            backgroundColor: theme.accent,
            color: theme.card,
            borderRadius: 999,
            fontFamily: fonts.body,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: stamp,
            transform: `rotate(-4deg) scale(${1.6 - 0.6 * stamp})`,
          }}
        >
          {TEXT.backtest.stamp.label}
        </span>
      )}
    </div>
  );
};

export const SceneBacktest: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const start = scene('backtest').from;
  const cue = LINES[BACKTEST_LINE_INDEX]?.from ?? start;
  const size = assets.ui?.shots['backtest'];
  const cardIn = easeOut(clamp01(frame / 10));
  const push = interpolate(frame, [0, scene('backtest').duration], [1, 1.03], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const frameDraw = easeOut(clamp01((frame - 8) / 16));
  const eyebrowIn = fadeIn(frame, 2, 8);
  const height = size === undefined ? 0 : (size.height * SHOW_WIDTH) / size.width;
  const rowAt = TEXT.backtest.rows.map((row, index) => wordFrame(assets, BACKTEST_LINE_INDEX, row.word, cue + 18 + index * 30) - start);
  const stampAt = wordFrame(assets, BACKTEST_LINE_INDEX, TEXT.backtest.stamp.word, cue + 80) - start;
  const sourceIn = fadeIn(frame, (rowAt[1] ?? 60) + 6, 10);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center' }}>
      <div style={{ marginTop: 64, fontFamily: fonts.body, fontSize: 28, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.accent, opacity: eyebrowIn }}>
        {TEXT.backtest.eyebrow}
      </div>
      <div style={{ marginTop: 26, height: height + 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {size === undefined ? (
          <div style={{ fontFamily: fonts.display, fontSize: 48, fontWeight: 600, color: theme.ink, border: `4px solid ${theme.accent}`, borderRadius: radii.cardSm, padding: '22px 36px', backgroundColor: theme.card }}>
            {TEXT.backtest.fallback}
          </div>
        ) : (
          <div style={{ position: 'relative', transform: `translateY(${(1 - cardIn) * 40}px) scale(${push * (0.96 + 0.04 * cardIn)})`, opacity: cardIn }}>
            <div style={{ padding: 18, backgroundColor: theme.paper, borderRadius: radii.card, boxShadow: shadow.card, border: `1px solid ${theme.hairline}` }}>
              <Img src={staticFile('ui/backtest.png')} style={{ display: 'block', width: SHOW_WIDTH, height }} />
            </div>
            {/* A red frame drawing itself from the left. */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: -8, borderRadius: radii.card + 6, border: `4px solid ${theme.accent}`, clipPath: `inset(0 ${100 - frameDraw * 100}% 0 0 round ${radii.card + 6}px)` }} />
          </div>
        )}
      </div>
      <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        {TEXT.backtest.rows.map((row, index) => (
          <Row key={row.label} row={row} at={rowAt[index] ?? 30} stampAt={row.strong ? stampAt : null} />
        ))}
        <div style={{ fontFamily: fonts.body, fontSize: 21, fontWeight: 500, color: theme.ink2, opacity: sourceIn }}>{TEXT.backtest.source}</div>
      </div>
    </AbsoluteFill>
  );
};
