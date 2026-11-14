/**
 * Remotion CLI configuration for the Field Shift demo video.
 * Output: H.264 / yuv420p MP4 (the NASA upload format); frames rendered as JPEG for speed.
 * REMOTION_BROWSER_EXECUTABLE lets a sandbox point Remotion at a Chromium it already has instead of downloading one.
 */
import { Config } from '@remotion/cli/config';

Config.setEntryPoint('./src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');

const browserExecutable = process.env['REMOTION_BROWSER_EXECUTABLE'];
if (browserExecutable !== undefined && browserExecutable !== '') {
  Config.setBrowserExecutable(browserExecutable);
}
