import type React from 'react';
import { type CalculateMetadataFunction, Composition } from 'remotion';
import { NO_ASSETS, probeAssets } from './assets';
import { FieldShift, type FieldShiftProps } from './FieldShift';
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from './script';

/** Finds which optional assets exist before the first frame, so missing clips become placeholders, never errors. */
const withAssets: CalculateMetadataFunction<FieldShiftProps> = async ({ props }) => ({
  props: { ...props, assets: await probeAssets() },
});

export const RemotionRoot: React.FC = () => (
  <Composition
    id="FieldShift"
    component={FieldShift}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ assets: NO_ASSETS }}
    calculateMetadata={withAssets}
  />
);
