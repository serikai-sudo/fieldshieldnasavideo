/**
 * Copies the two variable web fonts from their npm packages into public/fonts, so Remotion loads them with
 * staticFile() and never needs the network at render time. Runs on postinstall; safe to re-run (`pnpm fonts`).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'public', 'fonts');

/** Each family: the package and the file names to accept, most preferred first. */
const FONTS = [
  { out: 'fraunces.woff2', pkg: '@fontsource-variable/fraunces', candidates: ['fraunces-latin-wght-normal.woff2', 'fraunces-latin-full-normal.woff2'] },
  { out: 'inter.woff2', pkg: '@fontsource-variable/inter', candidates: ['inter-latin-wght-normal.woff2', 'inter-latin-full-normal.woff2'] },
];

mkdirSync(target, { recursive: true });
for (const font of FONTS) {
  const dir = join(root, 'node_modules', font.pkg, 'files');
  if (!existsSync(dir)) {
    console.error(`copy-fonts: ${font.pkg} is not installed (expected ${dir}); run pnpm install first.`);
    process.exit(1);
  }
  const available = readdirSync(dir);
  const file = font.candidates.find((name) => available.includes(name));
  if (file === undefined) {
    console.error(`copy-fonts: none of ${font.candidates.join(', ')} found in ${dir}. Files: ${available.join(', ')}`);
    process.exit(1);
  }
  copyFileSync(join(dir, file), join(target, font.out));
  console.log(`copy-fonts: ${font.pkg}/files/${file} → public/fonts/${font.out}`);
}
