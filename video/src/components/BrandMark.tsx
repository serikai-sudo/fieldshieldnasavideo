/**
 * The Field Shift logo mark: three field furrows under a sun. The four shapes are the approved mark, copied exactly
 * from the app (shield_field/src/components/top-bar.tsx BrandMark) — never imported from it.
 * `progress` 0 → 1 draws the furrows in one after another and pops the sun in last; 1 (default) is the finished mark.
 */
import type React from 'react';
import { theme } from '../theme';
import { clamp01, easeOut } from '../lib/anim';

const FURROWS = ['M5 13 Q15 8 27 12', 'M4 19 Q16 14 28 18', 'M5 25 Q16 20 28 24'] as const;

export const BrandMark: React.FC<{ readonly size: number; readonly progress?: number; readonly color?: string }> = ({
  size,
  progress = 1,
  color = theme.ink,
}) => {
  // Each furrow draws over 55 % of the progress, starting 15 % after the previous one; the sun grows in the last third.
  const drawn = (index: number): number => easeOut(clamp01((progress - index * 0.15) / 0.55));
  const sun = easeOut(clamp01((progress - 0.55) / 0.4));
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      {FURROWS.map((d, index) => (
        <path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={2.1}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - drawn(index)}
          opacity={drawn(index) > 0 ? 1 : 0}
        />
      ))}
      <circle cx={21} cy={9.4} r={2.7 * sun} fill={color} />
    </svg>
  );
};
