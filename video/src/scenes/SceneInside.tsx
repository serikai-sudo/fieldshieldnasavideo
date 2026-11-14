/**
 * "…one click shows water and heat risk, and how sure it is." The real tab bar of the field page (public/ui/dock-*.png)
 * at the top; as the voice names each part, its tab lights up — the bar cross-fades to a screenshot taken with that tab
 * really active, and a brick-red pulse rings it — and the top of that tab's real card slides in below and stays, so the
 * three stack: Water (the water the crop got), Heat (heat + drought days at flowering), Confidence (risk, band,
 * uncertainty). Word onsets come from public/words.json; without them the reveals are spread over the scene. Without
 * public/ui/ the scene falls back to plain chips. Paper, ink and the accent only.
 */
import type React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import type { Assets, Box } from '../assets';
import { Pill } from '../components/Pill';
import { clamp01, easeOut, fadeIn } from '../lib/anim';
import { wordFrame } from '../lib/words';
import { type SceneId, scene } from '../script';
import { radii, shadow, theme } from '../theme';

const DOCK_WIDTH = 1100;
const DOCK_TOP = 110;
const CARD_WIDTH = 1300;
const CARD_PADDING = 14;
const CARD_GAP = 16;
const FIRST_CARD_TOP = 236;
const IN_FRAMES = 9;
const DOCK_FADE = 5;
const PULSE_FRAMES = 16;
const MIN_STEP = 8;

export type Reveal = { readonly word: string; readonly tab: string; readonly shot: string; readonly crop: number };
type Timed = Reveal & { readonly frame: number };

/** The ring that marks the tab just named: grows a little and fades. */
const TabPulse: React.FC<{ readonly box: Box; readonly scale: number; readonly progress: number }> = ({ box, scale, progress }) => (
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: box.x * scale,
      top: box.y * scale,
      width: box.width * scale,
      height: box.height * scale,
      borderRadius: 9 * scale,
      border: `4px solid ${theme.accent}`,
      transform: `scale(${1 + 0.12 * easeOut(progress)})`,
      opacity: 0.7 * (1 - progress),
    }}
  />
);

export const SceneInside: React.FC<{
  readonly assets: Assets;
  readonly sceneId: SceneId;
  readonly lineIndex: number;
  readonly reveals: readonly Reveal[];
}> = ({ assets, sceneId, lineIndex, reveals }) => {
  const frame = useCurrentFrame();
  const { from: start, duration } = scene(sceneId);
  const ui = assets.ui;
  // Each reveal on its word — never before the scene's third frame (so the first still slides in) and at least
  // MIN_STEP frames after the one before, so two words said back to back still read as two steps.
  const timed: Timed[] = [];
  reveals.forEach((reveal, index) => {
    const spoken = wordFrame(assets, lineIndex, reveal.word, start + 4 + Math.round((index * (duration - 20)) / reveals.length)) - start;
    const previous = timed[index - 1];
    timed.push({ ...reveal, frame: Math.max(2, spoken, previous === undefined ? 0 : previous.frame + MIN_STEP) });
  });

  if (ui === null) {
    return (
      <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center', gap: 24, flexDirection: 'row' }}>
        {timed.map((reveal) => {
          const rise = easeOut(fadeIn(frame, reveal.frame, 8));
          return <Pill key={reveal.word} label={reveal.tab} size="xl" transform="none" dot={false} style={{ opacity: rise, transform: `translateY(${(1 - rise) * 18}px)` }} />;
        })}
      </AbsoluteFill>
    );
  }

  // The tab bar: Overview first, then each named tab from its word on, cross-fading.
  const states: { readonly frame: number; readonly tab: string }[] = [{ frame: -999, tab: 'overview' }, ...timed.map((reveal) => ({ frame: reveal.frame, tab: reveal.tab }))];
  const current = states.reduce((found, state, index) => (state.frame <= frame ? index : found), 0);
  const currentState = states[current];
  const previousState = states[current - 1];
  const dockMix = currentState === undefined ? 1 : clamp01((frame - currentState.frame) / DOCK_FADE);
  const dockScale = DOCK_WIDTH / ui.dock.width;
  const dockHeight = ui.dock.height * dockScale;
  const dockIn = easeOut(fadeIn(frame, 0, 8));

  let top = FIRST_CARD_TOP;
  const cards = timed.map((reveal) => {
    const height = reveal.crop * (CARD_WIDTH / (ui.shots[reveal.shot]?.width ?? 1060));
    const placed = { reveal, top, height };
    top += height + 2 * CARD_PADDING + CARD_GAP;
    return placed;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper }}>
      <div
        style={{
          position: 'absolute',
          left: (1920 - DOCK_WIDTH) / 2,
          top: DOCK_TOP,
          width: DOCK_WIDTH,
          height: dockHeight,
          opacity: dockIn,
          transform: `translateY(${(1 - dockIn) * -16}px)`,
          filter: 'drop-shadow(0 10px 24px rgba(20, 20, 20, 0.07))',
        }}
      >
        {previousState !== undefined && dockMix < 1 && <Img src={staticFile(`ui/dock-${previousState.tab}.png`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />}
        {currentState !== undefined && <Img src={staticFile(`ui/dock-${currentState.tab}.png`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: previousState === undefined ? 1 : dockMix }} />}
        {timed.map((reveal) => {
          const box = ui.dock.tabs[reveal.tab];
          const progress = (frame - reveal.frame) / PULSE_FRAMES;
          if (box === undefined || progress < 0 || progress > 1) return null;
          return <TabPulse key={`pulse-${reveal.word}`} box={box} scale={dockScale} progress={progress} />;
        })}
      </div>

      {cards.map(({ reveal, top: cardTop, height }) => {
        if (frame < reveal.frame) return null;
        const enter = easeOut(clamp01((frame - reveal.frame) / IN_FRAMES));
        const flash = 1 - clamp01((frame - reveal.frame - 4) / 12);
        const shotWidth = ui.shots[reveal.shot]?.width ?? 1060;
        const shotHeight = ui.shots[reveal.shot]?.height ?? reveal.crop;
        return (
          <div
            key={reveal.word}
            style={{
              position: 'absolute',
              left: (1920 - CARD_WIDTH) / 2 - CARD_PADDING,
              top: cardTop,
              padding: CARD_PADDING,
              backgroundColor: theme.card,
              border: `${flash > 0.02 ? 3 : 1}px solid ${flash > 0.02 ? theme.accent : theme.hairline}`,
              borderRadius: radii.card,
              boxShadow: shadow.card,
              opacity: enter,
              transform: `translateY(${(1 - enter) * 50}px) scale(${0.96 + 0.04 * enter})`,
            }}
          >
            {/* The top of the real card: the picture at full width, cut to `crop` CSS px. */}
            <div style={{ width: CARD_WIDTH, height, overflow: 'hidden' }}>
              <Img src={staticFile(`ui/${reveal.shot}.png`)} style={{ display: 'block', width: CARD_WIDTH, height: (shotHeight * CARD_WIDTH) / shotWidth }} />
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
