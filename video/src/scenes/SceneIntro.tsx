/**
 * 0–2.7 s: "I'm Ayaru, from team Algamura." The name rises in brick red as it is spoken and a red rule swipes
 * under it; "team Algamura" lands on its word; the Field Shift mark settles above. Word onsets from public/words.json.
 */
import type React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { Assets } from '../assets';
import { Wordmark } from '../components/Wordmark';
import { clamp01, easeOut, fadeIn } from '../lib/anim';
import { wordFrame } from '../lib/words';
import { INTRO_LINE_INDEX, LINES, TEXT } from '../script';
import { fonts, theme } from '../theme';

export const SceneIntro: React.FC<{ readonly assets: Assets }> = ({ assets }) => {
  const frame = useCurrentFrame();
  const cue = LINES[INTRO_LINE_INDEX]?.from ?? 4;
  const nameAt = wordFrame(assets, INTRO_LINE_INDEX, 'ayaru', cue + 14);
  const teamAt = wordFrame(assets, INTRO_LINE_INDEX, 'team', cue + 40);
  const hiIn = fadeIn(frame, cue, 8);
  const nameIn = easeOut(clamp01((frame - nameAt) / 9));
  const rule = easeOut(clamp01((frame - nameAt - 6) / 10));
  const teamIn = easeOut(clamp01((frame - teamAt) / 8));
  const markIn = easeOut(clamp01((frame - teamAt - 10) / 12));
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 96, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: markIn, transform: `translateY(${(1 - markIn) * -16}px)` }}>
        <Wordmark size={46} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateY(-36px)' }}>
        <div style={{ fontFamily: fonts.body, fontSize: 48, fontWeight: 500, color: theme.ink2, opacity: hiIn, transform: `translateY(${(1 - hiIn) * 12}px)` }}>{TEXT.intro.hi}</div>
        {/* The name rises out of a mask. */}
        <div style={{ overflow: 'hidden', paddingBottom: 18, marginTop: 4 }}>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 210,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.02,
              color: theme.accent,
              transform: `translateY(${(1 - nameIn) * 110}%)`,
            }}
          >
            {TEXT.intro.name}
          </div>
        </div>
        <div style={{ width: 560, height: 10, backgroundColor: theme.accent, transformOrigin: 'left', transform: `scaleX(${rule})`, marginTop: -6 }} />
        <div
          style={{
            marginTop: 34,
            fontFamily: fonts.body,
            fontSize: 46,
            fontWeight: 650,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: theme.ink,
            opacity: teamIn,
            transform: `translateY(${(1 - teamIn) * 18}px)`,
          }}
        >
          {TEXT.intro.team}
        </div>
      </div>
    </AbsoluteFill>
  );
};
