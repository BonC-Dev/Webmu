import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { examples } from '../js/examples.js';
import { validateFile } from '../js/importer.js';

test('every platform has a distinct sample with valid bytes, a cover and license records', async () => {
  const root = new URL('../assets/examples/', import.meta.url);
  const manifest = JSON.parse(await fs.readFile(new URL('games.json', root), 'utf8'));
  assert.deepEqual(
    examples.map((game) => game.system).sort(),
    ['gb', 'gbc', 'gba', 'nes', 'snes', 'sms', 'gg', 'genesis', 'flash'].sort()
  );
  const hashes = new Set();
  for (const game of examples) {
    const record = manifest.find((record) => record.system === game.system);
    const bytes = await fs.readFile(new URL(game.file, root));
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash, record.sha256, game.title);
    assert.equal(bytes.length, record.bytes);
    assert.equal(hashes.has(hash), false);
    hashes.add(hash);
    validateFile(
      game.file.split('/').pop(),
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      game.system
    );
    assert.ok(record.author && record.license && record.source.startsWith('https://'));
    assert.ok((await fs.readdir(new URL(record.notices + '/', root))).length > 0);
    const cover = await fs.readFile(new URL('../assets/covers/' + game.cover, import.meta.url));
    assert.equal(cover.subarray(1, 4).toString(), 'PNG');
  }
});
