import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import 'fake-indexeddb/auto';
import {importFile} from '../js/importer.js';
import {read} from '../js/database.js';
const bytes = await fs.readFile(new URL('../assets/examples/Pocket Meadow.gb', import.meta.url));
test('a file persists in the browser store', async () => {
  const result = await importFile(new File([bytes], 'first.gb'), 'gb');
  assert.ok(result.game);
  assert.ok((await read('Files', result.game.fileId)).blob);
});
test('same bytes with another name are a duplicate', async () => {
  await importFile(new File([bytes], 'one.gb'), 'gb');
  const second = await importFile(new File([bytes], 'two.gb'), 'gb');
  assert.equal(second.duplicate, true);
});
