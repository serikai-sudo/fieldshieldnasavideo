/**
 * The composition: nine scenes back to back (script.ts SCENES), each carrying one voice line over the picture it
 * describes, thrown in and out with whip motion and cut by a brick-red wipe; the voice-over when public/voiceover.mp3
 * exists, and the burned-in captions over everything. Fonts are loaded before the first frame is drawn.
 */
import type React from 'react';
import { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Series, continueRender, delayRender, staticFile } from 'remotion';
import { type Assets, VOICEOVER_FILE } from './assets';
import { Captions } from './components/Captions';
import { Tags } from './components/Tags';
import { WhipShell, WipeBars } from './components/Whip';
import { ensureFonts } from './fonts';
import { wordFrame } from './lib/words';
import { Scene02Problem } from './scenes/Scene02Problem';
import { SceneBacktest } from './scenes/SceneBacktest';
import { SceneBlind } from './scenes/SceneBlind';
import { QuestionInsert, SceneClip, SowBand } from './scenes/SceneClip';
import { SceneClose } from './scenes/SceneClose';
import { SceneIntro } from './scenes/SceneIntro';
import { PROOF_LINE_INDEX, TEXT, scene } from './script';
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
  // The band lands on "safest"; the question card leaves as the voice moves on to "In 2012".
  const bandAt = wordFrame(assets, 4, 'safest', scene('sowing').from + 48) - scene('sowing').from;
  const questionUntil = wordFrame(assets, PROOF_LINE_INDEX, 'in', scene('proof').from + 30) - scene('proof').from;
  return (
    <AbsoluteFill style={{ backgroundColor: theme.paper, color: theme.ink, fontFamily: fonts.body }}>
      <Series>
        {shell('intro', <SceneIntro assets={assets} />, { inFrames: 0 })}
        {shell('problem', <Scene02Problem assets={assets} />)}
        {shell('blind', <SceneBlind assets={assets} />)}
        {shell(
          'click',
          <SceneClip assets={assets} cut="click" placeholder={TEXT.click.placeholder}>
            <Tags assets={assets} sceneId="click" tags={TEXT.click.tags} top={118} side={230} />
          </SceneClip>,
        )}
        {shell(
          'sowing',
          <SceneClip assets={assets} cut="sowing" placeholder={TEXT.sowing.placeholder}>
            <SowBand text={TEXT.sowing.highlight} from={bandAt} />
            <Tags assets={assets} sceneId="sowing" tags={TEXT.sowing.tags} top={212} side={60} />
          </SceneClip>,
        )}
        {shell(
          'money',
          <SceneClip assets={assets} cut="money" placeholder={TEXT.money.placeholder}>
            <Tags assets={assets} sceneId="money" tags={TEXT.money.tags} top={300} side={70} />
          </SceneClip>,
        )}
        {shell(
          'proof',
          <SceneClip assets={assets} cut="proof" placeholder={TEXT.proof.placeholder}>
            <QuestionInsert text={TEXT.proof.question} until={questionUntil} />
          </SceneClip>,
        )}
        {shell('backtest', <SceneBacktest assets={assets} />)}
        {shell('close', <SceneClose assets={assets} />, { outFrames: 0 })}
      </Series>
      <WipeBars />
      {assets.voiceover && <Audio src={staticFile(VOICEOVER_FILE)} />}
      <Captions assets={assets} />
    </AbsoluteFill>
  );
};
