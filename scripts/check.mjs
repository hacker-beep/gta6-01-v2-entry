import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? files(file) : file.endsWith('.js') ? [file] : [];
  });
}
const source = [...files('game/src'), 'scripts/check.mjs', 'scripts/verify.mjs'];
for (const file of source) {
  const checked = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (checked.status !== 0) throw Error(`${file}\n${checked.stderr}`);
}
console.log(`Syntax clean: ${source.length} authored JavaScript files`);
