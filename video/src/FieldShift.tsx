/**
 * The composition: eight scenes back to back (script.ts SCENES), each carrying one voice line over the picture it
 * describes, thrown in and out with whip motion and cut by a brick-red wipe; the voice-over when public/voiceover.mp3
 * exists, and the burned-in captions over everything. Fonts are loaded before the first frame is drawn.
 */
import type React from 'react';
import { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Series, continueRender, delayRender, staticFile } from 'remotion';
import { type Assets, VOICEOVER_FILE } from './assets';
import { Captions } from './components/Captions';
import { WhipShell, WipeBars } from './components/Whip';
import { ensureFonts } from './fonts';
import { Scene02Problem } from './scenes/Scene02Problem';
import { SceneBacktest } from './scenes/SceneBacktest';
import { SceneClip, SowBand } from './scenes/SceneClip';
import { SceneData } from './scenes/SceneData';
import { SceneInside } from './scenes/SceneInside';
import { SceneIntro } from './scenes/SceneIntro';
import { TEXT, scene } from './script';
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
  const shell = (id: Parameters<typeof scene>[0], node: React.ReactNode, options: { inFrames?: number; outFrames?: number } = {}) => (
    <Series.Sequence key={id} durationInFrames={scene(id).duration} premountFor={20}>
      <WhipShell duration={scene(id).duration} {...options}>
        {node}
      </WhipShell>
    </Series.Sequence>
  );
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, color: theme.ink, fontFamily: fonts.body }}>
      <Series>
        {shell('intro', <SceneIntro assets={assets} />, { inFrames: 0 })}
        {shell('problem', <Scene02Problem />)}
        {shell('inside', <SceneInside assets={assets} />)}
        {shell('demoA', <SceneClip assets={assets} cut="demoA" placeholder={TEXT.demo.placeholderA} />)}
        {shell('demoB', <SceneClip assets={assets} cut="demoB" placeholder={TEXT.demo.placeholderB}><SowBand text={TEXT.demo.highlight} from={6} /></SceneClip>)}
        {shell('replay', <SceneClip assets={assets} cut="replay" placeholder={TEXT.replay.placeholder} />)}
        {shell('backtest', <SceneBacktest assets={assets} />)}
        {shell('data', <SceneData assets={assets} />, { outFrames: 0 })}
      </Series>
      <WipeBars />
      {assets.voiceover && <Audio src={staticFile(VOICEOVER_FILE)} />}
      <Captions />
    </AbsoluteFill>
  );
};
