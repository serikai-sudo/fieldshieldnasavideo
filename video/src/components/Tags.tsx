/**
 * Labels that pop onto a scene exactly when the voice says their word (public/words.json): a brick-red name on a white
 * card with an accent bar, and one plain line under it. Stacked in a column; each one springs in and stays.
 */
import type React from 'react';
import { useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { clamp01, easeOut } from '../lib/anim';
import { wordFrame } from '../lib/words';
import { type SceneId, type Tag, LINES, scene } from '../script';
import { fonts, theme } from '../theme';

export const Tags: React.FC<{
  readonly assets: Assets;
  readonly sceneId: SceneId;
  readonly tags: readonly Tag[];
  /** Where the column sits; `align` says which edge the cards hang from. */
  readonly top: number;
  readonly side: number;
  readonly align?: 'left' | 'right';
  readonly gap?: number;
}> = ({ assets, sceneId, tags, top, side, align = 'right', gap = 18 }) => {
  const frame = useCurrentFrame();
  const start = scene(sceneId).from;
  return (
    <div style={{ position: 'absolute', top, [align]: side, display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap, pointerEvents: 'none' }}>
      {tags.map((tag, index) => {
        const fallback = (LINES[tag.line]?.from ?? start) + 10 + index * 18;
        const at = wordFrame(assets, tag.line, tag.word, fallback) - start;
        const enter = easeOut(clamp01((frame - at) / 8));
        if (frame < at) return null;
        const pop = 1 + 0.08 * Math.sin(Math.PI * clamp01((frame - at) / 9));
        return (
          <div
            key={tag.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: align === 'right' ? 'flex-end' : 'flex-start',
              padding: '14px 24px 14px 24px',
              backgroundColor: theme.card,
              border: `1px solid ${theme.hairline}`,
              [align === 'right' ? 'borderRight' : 'borderLeft']: `8px solid ${theme.accent}`,
              borderRadius: 12,
              boxShadow: '0 14px 34px rgba(20, 20, 20, 0.14)',
              opacity: enter,
              transform: `translateX(${(1 - enter) * (align === 'right' ? 60 : -60)}px) scale(${pop})`,
              transformOrigin: align === 'right' ? 'right center' : 'left center',
            }}
          >
            <span style={{ fontFamily: fonts.display, fontSize: 42, fontWeight: 650, color: theme.accent, lineHeight: 1.05, whiteSpace: 'nowrap' }}>{tag.label}</span>
            {tag.sub !== undefined && <span style={{ fontFamily: fonts.body, fontSize: 25, fontWeight: 500, color: theme.ink, marginTop: 4, whiteSpace: 'nowrap' }}>{tag.sub}</span>}
          </div>
        );
      })}
    </div>
  );
};
