/**
 * S3b · 4.2–10 s: "Inside Field Shift". The real tab bar of the field page sits under the title; as the voice names
 * each part ("water, heat, sowing, economics, eight crops, nine-location robustness"), that tab lights up — the bar
 * cross-fades to a screenshot taken with that tab really active — and the real piece of the page it names slides in
 * below. Word onsets come from public/words.json (the voice's own word timings); without them the reveals are spread
 * evenly over the line. Without public/ui/ the scene falls back to plain chips. Paper and ink only.
 */
import type React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import type { Assets, Box, Size } from '../assets';
import { Pill } from '../components/Pill';
import { clamp01, easeOut, fadeIn } from '../lib/anim';
import { FPS, INSIDE_LINE_INDEX, LINES, TEXT, scene } from '../script';
import { fonts, radii, shadow, theme } from '../theme';

const DOCK_WIDTH = 1100;
const DOCK_TOP = 200;
/** The content pictures sit centred in this band, above the captions. */
const CONTENT_TOP = 340;
const CONTENT_BOTTOM = 880;
const CONTENT_MAX_WIDTH = 1240;
const CONTENT_MAX_HEIGHT = CONTENT_BOTTOM - CONTENT_TOP - 40;
/** Display width per picture (its CSS width scaled), capped by the band. */
const SHOT_SCALE: Readonly<Record<string, number>> = { water: 1.04, heat: 1.0, sowing: 0.96, money: 1.4, crops: 1.75, locations: 2.0 };
const IN_FRAMES = 10;
const OUT_FRAMES = 8;
const DOCK_FADE = 6;
const PULSE_FRAMES = 18;
/** The picture lands a hair before the word: the eye reads ahead of the ear. */
const LEAD_FRAMES = 2;

type Reveal = (typeof TEXT.inside.reveals)[number];
type Timed = Reveal & { readonly frame: number };

function normalise(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/** Each reveal's frame inside the scene: the onset of its word, or evenly spread over the line without timings. */
function revealFrames(assets: Assets): readonly Timed[] {
  const start = scene('inside').from;
  const line = LINES[INSIDE_LINE_INDEX];
  const spoken = assets.words?.find((entry) => entry.line === INSIDE_LINE_INDEX)?.words ?? null;
  const reveals = TEXT.inside.reveals;
  return reveals.map((reveal, index) => {
    const hit = spoken?.find((entry) => normalise(entry.word).startsWith(reveal.word));
    if (hit !== undefined) return { ...reveal, frame: Math.round(hit.at * FPS) - start - LEAD_FRAMES };
    const from = (line?.from ?? start) - start + 24;
    const to = (line?.to ?? start + scene('inside').duration) - start - 30;
    return { ...reveal, frame: Math.round(from + ((to - from) * index) / Math.max(1, reveals.length - 1)) };
  });
}

function fitted(size: Size, scale: number): Size {
  const width = Math.min(CONTENT_MAX_WIDTH, size.width * scale);
  const height = (size.height * width) / size.width;
  if (height <= CONTENT_MAX_HEIGHT) return { width, height };
  return { width: (width * CONTENT_MAX_HEIGHT) / height, height: CONTENT_MAX_HEIGHT };
}

/** The ring that marks the tab just named: grows a little and fades. */
const TabPulse: React.FC<{ readonly box: Box; readonly scale: number; readonly progress: number }> = ({ box, scale, progress }) => {
  const grow = 1 + 0.1 * easeOut(progress);
  const opacity = 0.55 * (1 - progress);
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: box.x * scale,
        top: box.y * scale,
        width: box.width * scale,
        height: box.height * scale,
        borderRadius: 9 * scale,
        border: `3px solid ${theme.ink}`,
        transform: `scale(${grow})`,
        opacity,
      }}
    />
  );
};

const Fallback: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = [TEXT.inside.chips.slice(0, 4), TEXT.inside.chips.slice(4)];
  return (
    <>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} style={{ position: 'absolute', left: 96, right: 96, top: 438 + rowIndex * 90, display: 'flex', justifyContent: 'center', gap: 24 }}>
          {row.map((chip, column) => {
            const rise = easeOut(fadeIn(frame, 3 + rowIndex * 4 + column, 8));
            return <Pill key={chip} label={chip} size="xl" transform="none" dot={false} style={{ opacity: rise, transform: `translateY(${(1 - rise) * 18}px)` }} />;
          })}
        </div>
      ))}
    </>
  );
};

export const SceneInside: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const sceneIn = fadeIn(frame, 0, 6);
  const titleIn = fadeIn(frame, 0, 10);
  const ui = assets.ui;
  const timed = revealFrames(assets);

  // The tab bar's states: Overview active at first, then each named tab from its word on.
  const dockStates: { readonly frame: number; readonly tab: string }[] = [{ frame: -999, tab: 'overview' }];
  for (const reveal of timed) if (reveal.tab !== null && reveal.tab !== dockStates[dockStates.length - 1]?.tab) dockStates.push({ frame: reveal.frame, tab: reveal.tab });
  const current = dockStates.reduce((found, state, index) => (state.frame <= frame ? index : found), 0);
  const currentState = dockStates[current];
  const previousState = dockStates[current - 1];
  const dockMix = currentState === undefined ? 1 : clamp01((frame - currentState.frame) / DOCK_FADE);
  const dockScale = ui === null ? 1 : DOCK_WIDTH / ui.dock.width;
  const dockHeight = ui === null ? 0 : ui.dock.height * dockScale;
  const dockIn = fadeIn(frame, 2, 10);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, opacity: sceneIn }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 92,
          textAlign: 'center',
          fontFamily: fonts.display,
          fontSize: 58,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: theme.ink,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 10}px)`,
        }}
      >
        {TEXT.inside.title}
      </div>

      {ui === null ? (
        <Fallback />
      ) : (
        <>
          {/* The real tab bar: the picture with the named tab active cross-fades over the previous one. */}
          <div
            style={{
              position: 'absolute',
              left: (1920 - DOCK_WIDTH) / 2,
              top: DOCK_TOP,
              width: DOCK_WIDTH,
              height: dockHeight,
              opacity: dockIn,
              transform: `translateY(${(1 - dockIn) * 14}px)`,
              filter: 'drop-shadow(0 10px 24px rgba(20, 20, 20, 0.07))',
            }}
          >
            {previousState !== undefined && dockMix < 1 && (
              <Img src={staticFile(`ui/dock-${previousState.tab}.png`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            )}
            {currentState !== undefined && (
              <Img src={staticFile(`ui/dock-${currentState.tab}.png`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: previousState === undefined ? 1 : dockMix }} />
            )}
            {timed.map((reveal) => {
              const box = reveal.tab === null ? undefined : ui.dock.tabs[reveal.tab];
              const progress = (frame - reveal.frame) / PULSE_FRAMES;
              if (box === undefined || progress < 0 || progress > 1) return null;
              return <TabPulse key={`pulse-${reveal.word}`} box={box} scale={dockScale} progress={progress} />;
            })}
          </div>

          {/* The real piece of the page each word names: slides up in, gives way to the next. */}
          {timed.map((reveal, index) => {
            const size = ui.shots[reveal.shot];
            if (size === undefined) return null;
            const next = timed[index + 1];
            const enter = easeOut(clamp01((frame - reveal.frame) / IN_FRAMES));
            const leave = next === undefined ? 0 : clamp01((frame - next.frame) / OUT_FRAMES);
            if (frame < reveal.frame || leave >= 1) return null;
            const shown = fitted(size, SHOT_SCALE[reveal.shot] ?? 1);
            const padding = 22;
            const top = CONTENT_TOP + (CONTENT_BOTTOM - CONTENT_TOP - shown.height - 2 * padding) / 2;
            return (
              <div
                key={reveal.word}
                style={{
                  position: 'absolute',
                  left: (1920 - shown.width - 2 * padding) / 2,
                  top,
                  padding,
                  backgroundColor: theme.paper,
                  border: `1px solid ${theme.hairline}`,
                  borderRadius: radii.card,
                  boxShadow: shadow.card,
                  opacity: enter * (1 - leave),
                  transform: `translateY(${(1 - enter) * 40 - leave * 24}px) scale(${0.97 + 0.03 * enter})`,
                }}
              >
                <Img src={staticFile(`ui/${reveal.shot}.png`)} style={{ display: 'block', width: shown.width, height: shown.height }} />
              </div>
            );
          })}
        </>
      )}
    </AbsoluteFill>
  );
};
