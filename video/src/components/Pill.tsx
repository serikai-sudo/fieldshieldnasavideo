/** A label pill in the app's style: white card, hairline, small-caps tracking. */
import type React from 'react';
import { fonts, radii, shadow, theme } from '../theme';

export const Pill: React.FC<{ readonly label: string; readonly style?: React.CSSProperties; readonly size?: 'md' | 'lg' }> = ({ label, style, size = 'md' }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: size === 'lg' ? '14px 26px' : '10px 20px',
      backgroundColor: theme.card,
      border: `1px solid ${theme.hairline}`,
      borderRadius: radii.pill,
      boxShadow: shadow.pill,
      fontFamily: fonts.body,
      fontSize: size === 'lg' ? 28 : 22,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: theme.ink,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: theme.ink2, flex: 'none' }} />
    {label}
  </div>
);
