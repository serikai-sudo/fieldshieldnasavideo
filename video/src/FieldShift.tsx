/**
 * The composition: five scenes back to back (script.ts SCENES), the voice-over when public/voiceover.mp3 exists, and
 * the burned-in captions over everything. Fonts are loaded before the first frame is drawn.
 */
import type React from 'react';
import { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Series, continueRender, delayRender, staticFile } from 'remotion';
import { type Assets, VOICEOVER_FILE } from './assets';
import { Captions } from './components/Captions';
import { ensureFonts } from './fonts';
import { Scene01Title } from './scenes/Scene01Title';
import { Scene02Problem } from './scenes/Scene02Problem';
import { Scene03Logo } from './scenes/Scene03Logo';
import { Scene04Magic } from './scenes/Scene04Magic';
import { Scene05Validation } from './scenes/Scene05Validation';
import { scene } from './script';
import { fonts, theme } from './theme';

export type FieldShiftProps = { readonly assets: Assets };

function useFonts(): void {
  const [handle] = useState(() => delayRender('Loading Fraunces and Inter'));
  useEffect(() => {
    ensureFonts()
      .catch((error: unknown) => {
        // A missing font file must not stop the render: the fallbacks in theme.ts take over and the console says why.
        console.warn('fonts: falling back to system fonts —', error);
      })
      .finally(() => continueRender(handle));
  }, [handle]);
}

export const FieldShift: React.FC<FieldShiftProps> = ({ assets }) => {
  useFonts();
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, color: theme.ink, fontFamily: fonts.body }}>
      <Series>
        <Series.Sequence durationInFrames={scene('title').duration}>
          <Scene01Title />
        </Series.Sequence>
        <Series.Sequence durationInFrames={scene('problem').duration}>
          <Scene02Problem />
        </Series.Sequence>
        <Series.Sequence durationInFrames={scene('logo').duration}>
          <Scene03Logo />
        </Series.Sequence>
        <Series.Sequence durationInFrames={scene('magic').duration} premountFor={20}>
          <Scene04Magic assets={assets} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={scene('validation').duration} premountFor={20}>
          <Scene05Validation assets={assets} />
        </Series.Sequence>
      </Series>
      {assets.voiceover && <Audio src={staticFile(VOICEOVER_FILE)} />}
      <Captions />
    </AbsoluteFill>
  );
};
