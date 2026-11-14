/** A quiet source / tagline chip: hairline, line-2 fill, ink-2 text. */
import type React from 'react';
import { fonts, radii, theme } from '../theme';

export const Chip: React.FC<{ readonly label: string; readonly style?: React.CSSProperties; readonly tone?: 'quiet' | 'card'; readonly size?: number }> = ({
  label,
  style,
  tone = 'quiet',
  size = 22,
}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: `${Math.round(size * 0.45)}px ${Math.round(size * 0.9)}px`,
      backgroundColor: tone === 'card' ? theme.card : theme.line2,
      border: `1px solid ${theme.hairline}`,
      borderRadius: radii.pill,
      fontFamily: fonts.body,
      fontSize: size,
      fontWeight: 500,
      letterSpacing: '0.02em',
      color: tone === 'card' ? theme.ink : theme.ink2,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {label}
  </div>
);
