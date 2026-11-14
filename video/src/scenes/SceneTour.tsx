/**
 * 1.2–27.7 s: the walkthrough. Eight steps cut from one continuous recording of the live platform (public/tour.mp4),
 * each starting at the second capture/tour.mjs logged for it (public/tour.json), joined by soft cross-fades. On every
 * step: a slow zoom towards the point that is clicked, a spotlight ring on the click itself, and a step pill.
 * Without the footage each step shows a labelled placeholder, so Studio and the render never break.
 */
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import type React from 'react';
import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { type Assets, TOUR_FILE, type TourStep } from '../assets';
import { Pill } from '../components/Pill';
import { Placeholder } from '../components/Placeholder';
import { easeInOut } from '../lib/anim';
import { FPS, STEPS, type Step, TEXT, TRANSITION_FRAMES, WIDTH, HEIGHT } from '../script';
import { theme } from '../theme';

const ZOOM = 1.03;
const SPOTLIGHT_FRAMES = 20;

/** The soft ring that marks a click: ink at low opacity, growing and fading. */
const Spotlight: React.FC<{ readonly x: number; readonly y: number; readonly progress: number }> = ({ x, y, progress }) => {
  const size = 70 + 110 * easeInOut(progress);
  const opacity = 0.38 * (1 - progress);
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: 999,
        border: `3px solid ${theme.ink}`,
        boxShadow: `0 0 0 ${8 * (1 - progress)}px rgba(26, 28, 30, ${0.08 * (1 - progress)})`,
        opacity,
      }}
    />
  );
};

const StepShot: React.FC<{ readonly step: Step; readonly index: number; readonly assets: Assets; readonly tourStep: TourStep | null }> = ({ step, index, assets, tourStep }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const click = tourStep?.click ?? null;
  const originX = click?.x ?? WIDTH / 2;
  const originY = click?.y ?? HEIGHT / 2;
  const zoom = interpolate(frame, [0, step.frames], [1, ZOOM], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const clickFrame = tourStep !== null && click !== null ? Math.round((click.sec - tourStep.startSec) * FPS) : null;
  const spotlight = clickFrame === null ? null : (frame - clickFrame) / SPOTLIGHT_FRAMES;
  const pillIn = spring({ frame: frame - TRANSITION_FRAMES / 2, fps, config: { damping: 18, stiffness: 150, mass: 0.8 } });
  const footage = assets.tour.exists && tourStep !== null;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${originX}px ${originY}px` }}>
        {footage ? (
          <OffthreadVideo src={staticFile(TOUR_FILE)} startFrom={Math.round(tourStep.startSec * FPS)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Placeholder text={`${TEXT.placeholder} · ${step.label}`} file={TOUR_FILE} />
        )}
        {spotlight !== null && spotlight >= 0 && spotlight <= 1 && click !== null && <Spotlight x={click.x} y={click.y} progress={spotlight} />}
      </AbsoluteFill>
      <div style={{ position: 'absolute', right: 48, top: 40, opacity: Math.min(1, Math.max(0, pillIn)), transform: `translateX(${(1 - pillIn) * 48}px)` }}>
        <Pill label={`${index + 1} · ${step.label}`} size="xl" transform="none" dot={false} />
      </div>
    </AbsoluteFill>
  );
};

export const SceneTour: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const items: React.ReactNode[] = [];
  STEPS.forEach((step, index) => {
    items.push(
      <TransitionSeries.Sequence key={step.id} durationInFrames={step.frames}>
        <StepShot step={step} index={index} assets={assets} tourStep={assets.tour.steps?.[index] ?? null} />
      </TransitionSeries.Sequence>,
    );
    if (index < STEPS.length - 1) {
      items.push(<TransitionSeries.Transition key={`${step.id}-fade`} presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })} />);
    }
  });
  return <TransitionSeries>{items}</TransitionSeries>;
};
