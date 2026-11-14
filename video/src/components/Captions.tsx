/**
 * Burned-in English subtitles: the voice-over line of the current frame (script.ts LINES), ink text on a white card
 * chip, bottom-centre, at most two lines. Rendered once at the composition level so its frames are absolute.
 */
import type React from 'react';
import { useCurrentFrame } from 'remotion';
import { lineAt } from '../script';
import { fonts, radii, shadow, theme } from '../theme';

const FADE_FRAMES = 5;

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const line = lineAt(frame);
  if (line === undefined) return null;
  const opacity = Math.min(1, (frame - line.from + 1) / FADE_FRAMES, (line.to - frame) / FADE_FRAMES);
  const rise = (1 - Math.min(1, (frame - line.from + 1) / FADE_FRAMES)) * 10;
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
        {line.text}
      </div>
    </div>
  );
};
