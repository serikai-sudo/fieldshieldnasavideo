/**
 * What a scene shows while an asset is missing from public/: a paper frame with a hairline, the labelled text, and the
 * file name to drop in. Nothing here is rendered once the real file exists.
 */
import type React from 'react';
import { AbsoluteFill } from 'remotion';
import { fonts, radii, theme } from '../theme';

export const Placeholder: React.FC<{ readonly text: string; readonly file: string; readonly compact?: boolean }> = ({ text, file, compact = false }) => (
  <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center', padding: compact ? 16 : 72 }}>
    <div
      style={{
        width: '100%',
        height: '100%',
        border: `2px dashed ${theme.hairline}`,
        borderRadius: compact ? radii.cardSm : radii.card,
        backgroundColor: theme.card,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 10 : 24,
        textAlign: 'center',
        padding: compact ? 12 : 48,
      }}
    >
      <div style={{ fontFamily: fonts.display, fontSize: compact ? 22 : 52, fontWeight: 500, color: theme.ink, lineHeight: 1.2, textWrap: 'balance' }}>{text}</div>
      <div style={{ fontFamily: fonts.body, fontSize: compact ? 14 : 24, color: theme.ink2 }}>
        placeholder · drop <span style={{ color: theme.ink, fontWeight: 600 }}>public/{file}</span> to replace
      </div>
    </div>
  </AbsoluteFill>
);
