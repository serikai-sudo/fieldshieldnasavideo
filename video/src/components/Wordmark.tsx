/** The mark beside the wordmark, as the app's top bar draws it, scaled for video. */
import type React from 'react';
import { BrandMark } from './BrandMark';
import { fonts, theme } from '../theme';

export const Wordmark: React.FC<{ readonly size: number; readonly progress?: number; readonly style?: React.CSSProperties }> = ({ size, progress = 1, style }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.5, ...style }}>
    <BrandMark size={size * 1.35} progress={progress} />
    <span style={{ fontFamily: fonts.display, fontSize: size, fontWeight: 500, color: theme.ink, letterSpacing: '-0.01em', lineHeight: 1 }}>Field Shift</span>
  </div>
);
