// Kestrel Yard — the handover program for make.fun's threejs-fps-02.
// Node 22, standard library only, no build step: run it with `node main.ts`.
//
// What it does, in three steps:
//   1. copies the playable game (game/) beside this file into the output
//      directory, so the grader receives exactly the files the browser loads;
//   2. copies screenshots/ the same way (the first image by name is the cover);
//   3. writes dossier.json, the judge's summary of the game, using the
//      vendored make.fun library — the same library the scorer re-runs, so
//      the dossier on disk must match what buildDossier computes.
//
// The output directory is /output inside the grader's container. Anywhere
// else, set MAKEFUN_OUTPUT_DIR to a folder of your choice:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To play the game instead, serve it locally: `node serve.ts`.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

// The folder this file lives in — game/ and screenshots/ sit beside it.
const entryDir = fileURLToPath(new URL('.', import.meta.url));

// Where the finished handover goes: the grader's /output, or a folder
// chosen through the environment when running the entry by hand.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the scorer's gate.json hands buildDossier. Only text_max_bytes
// changes the dossier's bytes; the rest refuse an entry the scorer would
// refuse anyway — more than 4 screenshots, one over 256 KiB, more than 993
// files in game/ or 48 MiB of game files in all (game/ shares the platform's
// 1000-entry /output cap with screenshots/ and dossier.json itself).
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
} as const;

/** Copy a directory tree when it exists; the game's folder always does, the screenshots folder may not yet. */
function copyTreeIfPresent(source: string, target: string): void {
  if (!existsSync(source)) return;
  cpSync(source, target, { recursive: true });
}

// Stage the output directory first, then lay the game and its screenshots
// into it, and finally write the dossier that describes them. Fail early
// with a plain message when the game folder itself is missing, instead of
// letting the dossier builder report a bare directory error later.
const gameDir = join(entryDir, 'game');
if (!existsSync(gameDir)) {
  throw new Error(`Kestrel Yard: no game/ beside main.ts (looked in ${entryDir})`);
}
mkdirSync(outputDir, { recursive: true });
copyTreeIfPresent(gameDir, join(outputDir, 'game'));
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
copyTreeIfPresent(join(entryDir, 'screenshots'), join(outputDir, 'screenshots'));

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));

console.log(`Kestrel Yard handed in to ${outputDir}`);
