/**
 * The composition: the title sting, the walkthrough and the end card (script.ts SCENES), the voice-over when
 * public/voiceover.mp3 exists, and the burned-in captions over everything. Fonts are loaded before the first frame.
 */
import type React from 'react';
import { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Series, continueRender, delayRender, staticFile } from 'remotion';
import { type Assets, VOICEOVER_FILE } from './assets';
import { Captions } from './components/Captions';
import { ensureFonts } from './fonts';
import { SceneEnd } from './scenes/SceneEnd';
import { SceneTitle } from './scenes/SceneTitle';
import { SceneTour } from './scenes/SceneTour';
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
          <SceneTitle />
        </Series.Sequence>
        <Series.Sequence durationInFrames={scene('tour').duration} premountFor={20}>
          <SceneTour assets={assets} />
        </Series.Sequence>
        <Series.Sequence durationInFrames={scene('end').duration}>
          <SceneEnd />
        </Series.Sequence>
      </Series>
      {assets.voiceover && <Audio src={staticFile(VOICEOVER_FILE)} />}
      <Captions />
    </AbsoluteFill>
  );
};
