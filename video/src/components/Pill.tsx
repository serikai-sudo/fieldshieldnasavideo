/** A label pill in the app's style: white card, hairline, small-caps tracking; `xl` is the sentence-case feature chip. */
import type React from 'react';
import { fonts, radii, shadow, theme } from '../theme';

type PillSize = 'md' | 'lg' | 'xl';

const SIZES: Readonly<Record<PillSize, { readonly padding: string; readonly fontSize: number }>> = {
  md: { padding: '10px 20px', fontSize: 22 },
  lg: { padding: '14px 26px', fontSize: 28 },
  xl: { padding: '15px 28px', fontSize: 29 },
};

export const Pill: React.FC<{
  readonly label: string;
  readonly style?: React.CSSProperties;
  readonly size?: PillSize;
  /** Uppercase tracking (the source pills) or sentence case (the feature chips). */
  readonly transform?: 'uppercase' | 'none';
  readonly dot?: boolean;
}> = ({ label, style, size = 'md', transform = 'uppercase', dot = true }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      padding: SIZES[size].padding,
      backgroundColor: theme.card,
      border: `1px solid ${theme.hairline}`,
      borderRadius: radii.pill,
      boxShadow: shadow.pill,
      fontFamily: fonts.body,
      fontSize: SIZES[size].fontSize,
      fontWeight: 600,
      letterSpacing: transform === 'uppercase' ? '0.06em' : '-0.005em',
      textTransform: transform,
      color: theme.ink,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {dot && <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: theme.ink2, flex: 'none' }} />}
    {label}
  </div>
);
