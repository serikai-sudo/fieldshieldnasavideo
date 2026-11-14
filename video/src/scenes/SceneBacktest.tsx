/**
 * 21.3–24 s: "Back-tested against national wheat yields." The real back-test card of the Confidence tab
 * (public/ui/backtest.png: ρ = −0.63, p < 0.001, worst years caught) under a brick-red eyebrow, with a slow push-in
 * and a red frame that draws itself around it. Fallback without the picture: the stamp line as text.
 */
import type React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { clamp01, easeOut, fadeIn } from '../lib/anim';
import { TEXT } from '../script';
import { fonts, radii, shadow, theme } from '../theme';

const SHOW_WIDTH = 1480;

export const SceneBacktest: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const size = assets.ui?.shots['backtest'];
  const cardIn = easeOut(clamp01(frame / 10));
  const push = interpolate(frame, [0, 81], [1, 1.045], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const frameDraw = easeOut(clamp01((frame - 8) / 16));
  const eyebrowIn = fadeIn(frame, 2, 8);
  const height = size === undefined ? 0 : (size.height * SHOW_WIDTH) / size.width;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 104, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.body, fontSize: 30, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.accent, opacity: eyebrowIn }}>
        {TEXT.backtest.eyebrow}
      </div>
      {size === undefined ? (
        <div style={{ fontFamily: fonts.display, fontSize: 52, fontWeight: 600, color: theme.ink, border: `4px solid ${theme.accent}`, borderRadius: radii.cardSm, padding: '22px 36px', backgroundColor: theme.card }}>
          {TEXT.backtest.fallback}
        </div>
      ) : (
        <div style={{ position: 'relative', transform: `translateY(${(1 - cardIn) * 50 - 20}px) scale(${push * (0.96 + 0.04 * cardIn)})`, opacity: cardIn }}>
          <div style={{ padding: 18, backgroundColor: theme.paper, borderRadius: radii.card, boxShadow: shadow.card, border: `1px solid ${theme.hairline}` }}>
            <Img src={staticFile('ui/backtest.png')} style={{ display: 'block', width: SHOW_WIDTH, height }} />
          </div>
          {/* A red frame drawing itself: top and bottom edges grow from the left, the sides fill in after. */}
          <div aria-hidden="true" style={{ position: 'absolute', inset: -8, borderRadius: radii.card + 6, border: `5px solid ${theme.accent}`, clipPath: `inset(0 ${100 - frameDraw * 100}% 0 0 round ${radii.card + 6}px)` }} />
        </div>
      )}
    </AbsoluteFill>
  );
};
