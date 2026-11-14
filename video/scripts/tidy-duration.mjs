#!/usr/bin/env node
/**
 * Remotion muxes the voice-over as AAC, whose frame padding makes the container read a few milliseconds past the
 * 885-frame video track (29.504 s instead of 29.500 s). This re-muxes the render in place with the video stream copied
 * untouched and the audio trimmed to the video's length, so every probe reads exactly 29.500 s. Usage:
 *   node scripts/tidy-duration.mjs out/field-shift.mp4
 */
import { spawnSync } from 'node:child_process';
import { renameSync } from 'node:fs';

const [file] = process.argv.slice(2);
if (!file) {
  console.error('usage: tidy-duration.mjs <render.mp4>');
  process.exit(1);
}
const probe = (entries, path) => spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', entries, '-of', 'csv=p=0', path], { encoding: 'utf8' }).stdout.trim();
const videoSeconds = Number.parseFloat(probe('stream=duration', file));
if (!Number.isFinite(videoSeconds)) {
  console.error(`tidy-duration: cannot read the video duration of ${file}`);
  process.exit(1);
}
const hasAudio = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim() !== '';
if (!hasAudio) {
  console.log(`tidy-duration: ${file} has no audio stream; nothing to trim (video ${videoSeconds.toFixed(3)} s).`);
  process.exit(0);
}
const tmp = `${file}.tidy.mp4`;
const trim = Math.max(0, videoSeconds - 0.03);
const result = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-c:v', 'copy', '-af', `atrim=0:${trim.toFixed(3)},apad=whole_dur=${videoSeconds.toFixed(3)}`, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', tmp], { stdio: 'inherit' });
if (result.status !== 0) {
  console.error('tidy-duration: ffmpeg failed; the render is left as it was.');
  process.exit(1);
}
renameSync(tmp, file);
const format = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim();
console.log(`tidy-duration: ${file} → container ${Number.parseFloat(format).toFixed(3)} s, video ${videoSeconds.toFixed(3)} s`);
