/**
 * S3b · 7–10 s: "Inside Field Shift" — a table of contents before the live demo. Fraunces title, two rows of four
 * sentence-case chips (script.ts TEXT.inside), each rising in one frame after the other (~0.6 s), then held still so
 * the jury can read them. Paper and ink only.
 */
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Pill } from '../components/Pill';
import { easeOut, fadeIn } from '../lib/anim';
import { TEXT } from '../script';
import { fonts, theme } from '../theme';

const PER_ROW = 4;
const ROW_TOP = [438, 528] as const;

export const SceneInside: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneIn = fadeIn(frame, 0, 6);
  const titleIn = fadeIn(frame, 0, 10);
  const rows = [TEXT.inside.chips.slice(0, PER_ROW), TEXT.inside.chips.slice(PER_ROW)];
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, opacity: sceneIn }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 290,
          textAlign: 'center',
          fontFamily: fonts.display,
          fontSize: 60,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: theme.ink,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 10}px)`,
        }}
      >
        {TEXT.inside.title}
      </div>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} style={{ position: 'absolute', left: 96, right: 96, top: ROW_TOP[rowIndex], display: 'flex', justifyContent: 'center', gap: 24 }}>
          {row.map((chip, column) => {
            const index = rowIndex * PER_ROW + column;
            const rise = easeOut(fadeIn(frame, 3 + index, 8));
            return <Pill key={chip} label={chip} size="xl" transform="none" dot={false} style={{ opacity: rise, transform: `translateY(${(1 - rise) * 18}px)` }} />;
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};
