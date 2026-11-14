/**
 * Burned-in English subtitles: the voice-over line of the current frame (script.ts LINES), ink text on a white card
 * chip, bottom-centre, at most two lines. The line's `*…*` phrase — the one the voice lifts — is set in the brick-red
 * accent and pops as it is spoken (public/words.json); a few names stay accent throughout. Rendered once at the
 * composition level so its frames are absolute.
 */
import type React from 'react';
import { useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { clamp01 } from '../lib/anim';
import { wordFrame } from '../lib/words';
import { CAPTION_HIGHLIGHTS, LINES, lineAt, segmentsOf } from '../script';
import { fonts, radii, shadow, theme } from '../theme';

const FADE_FRAMES = 5;
const POP_FRAMES = 10;

const PATTERN = new RegExp(`(${CAPTION_HIGHLIGHTS.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

/** Plain text with the always-accent names set in the accent colour. */
function highlighted(text: string, key: string): React.ReactNode[] {
  return text.split(PATTERN).map((part, index) =>
    CAPTION_HIGHLIGHTS.includes(part) ? (
      <span key={`${key}-${index}`} style={{ color: theme.accent, fontWeight: 650 }}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export const Captions: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const line = lineAt(frame);
  if (line === undefined || line.caption === false) return null;
  const index = LINES.indexOf(line);
  const opacity = Math.min(1, (frame - line.from + 1) / FADE_FRAMES, (line.to - frame) / FADE_FRAMES);
  const rise = (1 - Math.min(1, (frame - line.from + 1) / FADE_FRAMES)) * 10;
  const segments = segmentsOf(line.text);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 56, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div
        style={{
          maxWidth: 1240,
          opacity,
          transform: `translateY(${rise}px)`,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: `1px solid ${theme.hairline}`,
          borderRadius: radii.cardSm,
          boxShadow: shadow.pill,
          padding: '14px 28px',
          fontFamily: fonts.body,
          fontSize: 34,
          lineHeight: 1.3,
          fontWeight: 500,
          color: theme.ink,
          textAlign: 'center',
          textWrap: 'balance',
        }}
      >
        {segments.map((segment, k) => {
          // A space between segments, except before punctuation that closes the phrase before it.
          const gap = k > 0 && !/^[,.;:!?]/.test(segment.text) ? ' ' : '';
          const text = gap + segment.text;
          if (!segment.emphasis) return <span key={k}>{highlighted(text, String(k))}</span>;
          const first = segment.text.split(' ')[0] ?? '';
          const at = wordFrame(assets, index, first, line.from + 30, 1, 'last');
          const t = clamp01((frame - at) / POP_FRAMES);
          const pop = frame < at ? 1 : 1 + 0.08 * Math.sin(Math.PI * t);
          return (
            <span key={k}>
              {gap}
              <span style={{ display: 'inline-block', color: theme.accent, fontWeight: 650, transform: `scale(${pop})`, transformOrigin: 'left bottom' }}>{segment.text}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
