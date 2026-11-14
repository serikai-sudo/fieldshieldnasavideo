/**
 * "Next: every rainfed grain belt on Earth." The wordmark, then the line itself set big, word by word on the voice
 * (public/words.json), "Earth" in brick red with a swipe under it, and the live address from the start. This line has no subtitle:
 * the scene is its subtitle.
 */
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { Wordmark } from '../components/Wordmark';
import { clamp01, easeOut, fadeIn } from '../lib/anim';
import { wordFrame } from '../lib/words';
import { CLOSE_LINE_INDEX, LINES, TEXT, scene } from '../script';
import { fonts, theme } from '../theme';

export const SceneClose: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const start = scene('close').from;
  const cue = (LINES[CLOSE_LINE_INDEX]?.from ?? start) - start;
  const words = TEXT.close.line.split(' ');
  const wordAt = words.map((word, index) => wordFrame(assets, CLOSE_LINE_INDEX, word.toLowerCase(), start + cue + 12 + index * 6, 3) - start);
  const markIn = easeOut(fadeIn(frame, 0, 10));
  const leadIn = easeOut(fadeIn(frame, cue, 6));
  const lastAt = wordAt[wordAt.length - 1] ?? 50;
  const swipe = easeOut(clamp01((frame - lastAt - 4) / 10));
  const urlIn = easeOut(fadeIn(frame, 6, 10));
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 110, opacity: markIn, transform: `translateY(${(1 - markIn) * -16}px)` }}>
        <Wordmark size={52} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, marginTop: -20 }}>
        <div style={{ fontFamily: fonts.body, fontSize: 34, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.accent, opacity: leadIn }}>
          {TEXT.close.lead}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 30, rowGap: 6, width: 1500, fontFamily: fonts.display, fontSize: 118, fontWeight: 500, lineHeight: 1.08, letterSpacing: '-0.015em', color: theme.ink }}>
          {words.map((word, index) => {
            // "every rainfed grain belt / on Earth": the break sits before the last two words.
            const lineBreak = index === words.length - 2 ? <div key="break" style={{ flexBasis: '100%', height: 0 }} /> : null;
            const at = wordAt[index] ?? 0;
            const rise = easeOut(clamp01((frame - at) / 7));
            const isLast = index === words.length - 1;
            return [
              lineBreak,
              <span key={`${word}-${index}`} style={{ position: 'relative', display: 'inline-block', overflow: 'visible', opacity: rise, transform: `translateY(${(1 - rise) * 40}px)`, color: isLast ? theme.accent : theme.ink }}>
                {word}
                {isLast && <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: -6, height: 9, backgroundColor: theme.accent, transformOrigin: 'left', transform: `scaleX(${swipe})` }} />}
              </span>,
            ];
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 120, padding: '14px 34px', borderRadius: 999, border: `2px solid ${theme.ink}`, backgroundColor: theme.card, fontFamily: fonts.body, fontSize: 38, fontWeight: 600, color: theme.ink, opacity: urlIn, transform: `translateY(${(1 - urlIn) * 20}px)` }}>
        {TEXT.close.url}
      </div>
    </AbsoluteFill>
  );
};
