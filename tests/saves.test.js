import { test } from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { storeSave, exportState, importState } from '../js/saves.js';
import { read } from '../js/database.js';

const game = { id: 'save-test', fileId: 'a'.repeat(64), system: 'gb' };
test('a stored checkpoint exports and imports without changing its bytes', async () => {
  const bytes = new Uint8Array([1, 40, 255, 0, 12]);
  await storeSave(game, 'state', bytes);
  const record = await read('Saves', game.id + ':state');
  const file = new File([await exportState(record)], 'save.json');
  assert.deepEqual(await importState(file, game), bytes);
  assert.equal(record.kind, 'state');
  assert.equal(record.gameId, game.id);
});

test('wrong-game, damaged and unsupported-version saves are rejected', async () => {
  const record = await storeSave(game, 'state', new Uint8Array([2, 3, 5]));
  const data = JSON.parse(await (await exportState(record)).text());
  const file = () => new File([JSON.stringify(data)], 'save.json');
  await assert.rejects(importState(file(), { ...game, fileId: 'b'.repeat(64) }), /different game/);
  data.data = btoa('damaged');
  await assert.rejects(importState(file(), game), /damaged/);
  data.version = 99;
  await assert.rejects(importState(file(), game), /Webmu game save/);
});
