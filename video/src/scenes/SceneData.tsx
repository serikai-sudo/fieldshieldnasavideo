/**
 * 24–29.5 s: "Built on NASA POWER, SMAP, SRTM and MODIS." The team's own slide, in motion: the real source chips of the
 * platform under the title, then the four NASA sources — brick-red names, a red rule, one plain line on what each
 * gives — lighting as the voice names them; the partners (ESA WorldCover, SoilGrids, FAOSTAT) follow, shown apart
 * because they are not NASA. When the voice ends, the address settles at the foot of the slide.
 */
import type React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { Wordmark } from '../components/Wordmark';
import { clamp01, easeOut, fadeIn } from '../lib/anim';
import { wordFrame } from '../lib/words';
import { DATA_LINE_INDEX, LINES, TEXT, scene } from '../script';
import { fonts, theme } from '../theme';

const RULE_X = 1000;
const NAME_RIGHT = RULE_X - 44;
const NASA_TOP = 286;
const NASA_ROW = 82;
const PARTNER_TOP = 664;
const PARTNER_ROW = 58;
/** After the voice line (it ends near local frame 118): the address takes the caption's place. */
const FOOTER_AT = 122;

const Row: React.FC<{ readonly name: string; readonly caption: string; readonly top: number; readonly size: number; readonly at: number; readonly frame: number }> = ({ name, caption, top, size, at, frame }) => {
  const lit = easeOut(clamp01((frame - at) / 8));
  const ghost = 0.18;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          right: 1920 - NAME_RIGHT,
          top,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          fontFamily: fonts.display,
          fontSize: size,
          fontWeight: 600,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          color: theme.accent,
          whiteSpace: 'nowrap',
          opacity: ghost + (1 - ghost) * lit,
          transform: `translateX(${(1 - lit) * -26}px) scale(${1 + 0.06 * Math.sin(Math.PI * clamp01((frame - at) / 10))})`,
          transformOrigin: 'right center',
        }}
      >
        <span aria-hidden="true" style={{ width: size * 0.22, height: size * 0.22, borderRadius: 999, backgroundColor: theme.accent }} />
        {name}
      </div>
      <div
        style={{
          position: 'absolute',
          left: RULE_X + 40,
          top: top + size * 0.18,
          fontFamily: fonts.body,
          fontSize: size * 0.56,
          fontWeight: 500,
          color: theme.ink,
          whiteSpace: 'nowrap',
          opacity: lit,
          transform: `translateX(${(1 - lit) * 30}px)`,
        }}
      >
        {caption}
      </div>
    </>
  );
};

export const SceneData: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const start = scene('data').from;
  const cue = (LINES[DATA_LINE_INDEX]?.from ?? start + 3) - start;
  const nasaAt = TEXT.data.nasa.map((row, index) => wordFrame(assets, DATA_LINE_INDEX, row.word, start + cue + 12 + index * 22) - start);
  const lastNasa = nasaAt[nasaAt.length - 1] ?? 90;
  const partnersAt = TEXT.data.partners.map((_, index) => lastNasa + 8 + index * 5);
  const titleIn = fadeIn(frame, 0, 8);
  const chips = assets.ui?.shots['sources'];
  const chipsIn = fadeIn(frame, 4, 8);
  const rule = easeOut(clamp01((frame - 6) / 16));
  const partnersLabelIn = fadeIn(frame, (partnersAt[0] ?? 110) - 4, 6);
  const footer = easeOut(clamp01((frame - FOOTER_AT) / 9));
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper }}>
      <div style={{ position: 'absolute', top: 64, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.display, fontSize: 64, fontWeight: 600, letterSpacing: '-0.01em', color: theme.ink, opacity: titleIn, transform: `translateY(${(1 - titleIn) * 12}px)` }}>
        Built on <span style={{ color: theme.accent }}>NASA</span> Earth data
      </div>
      {chips !== undefined && (
        <div style={{ position: 'absolute', top: 168, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: chipsIn }}>
          <Img src={staticFile('ui/sources.png')} style={{ width: chips.width * 2.3, height: chips.height * 2.3 }} />
        </div>
      )}
      <div aria-hidden="true" style={{ position: 'absolute', left: RULE_X, top: NASA_TOP - 10, width: 5, height: (PARTNER_TOP + 3 * PARTNER_ROW - NASA_TOP + 10) * rule, backgroundColor: theme.accent }} />
      {TEXT.data.nasa.map((row, index) => (
        <Row key={row.name} name={row.name} caption={row.caption} top={NASA_TOP + index * NASA_ROW} size={66} at={nasaAt[index] ?? 30 + index * 20} frame={frame} />
      ))}
      <div style={{ position: 'absolute', right: 1920 - NAME_RIGHT, top: PARTNER_TOP - 52, fontFamily: fonts.body, fontSize: 24, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.ink2, opacity: partnersLabelIn }}>
        {TEXT.data.partnersTitle}
      </div>
      {TEXT.data.partners.map((row, index) => (
        <Row key={row.name} name={row.name} caption={row.caption} top={PARTNER_TOP + index * PARTNER_ROW} size={44} at={partnersAt[index] ?? 110} frame={frame} />
      ))}

      {/* The address, where the captions were, once the voice has ended. */}
      {frame >= FOOTER_AT && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center', opacity: footer, transform: `translateY(${(1 - footer) * 30}px)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '16px 36px', backgroundColor: theme.card, border: `1px solid ${theme.hairline}`, borderBottom: `5px solid ${theme.accent}`, borderRadius: 16, boxShadow: '0 10px 30px rgba(20, 20, 20, 0.06)' }}>
            <Wordmark size={44} />
            <div style={{ width: 2, height: 46, backgroundColor: theme.hairline }} />
            <div style={{ fontFamily: fonts.display, fontSize: 46, fontWeight: 600, color: theme.accent }}>{TEXT.data.url}</div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
