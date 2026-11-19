/** Submission transport. The playable artifact is the self-contained game tree. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

function exportEntry(destination: string) {
  const source = path.dirname(fileURLToPath(import.meta.url));
  fs.mkdirSync(destination, { recursive: true });
  for (const folder of ['game', 'screenshots']) {
    fs.cpSync(path.join(source, folder), path.join(destination, folder), { recursive: true });
  }
  const limits = {
    game_max_bytes: 48 * 1024 * 1024,
    game_max_files: 993,
    game_path_max_bytes: 1000,
    screenshots: { max_bytes: 256 * 1024, max: 4 },
    text_max_bytes: 160 * 1024,
  };
  const dossier = buildDossier(destination, limits);
  fs.writeFileSync(path.join(destination, 'dossier.json'), dossier);
  console.log(`Exported offline entry to ${destination}`);
}

exportEntry(process.env.MAKEFUN_OUTPUT_DIR || '/output');
