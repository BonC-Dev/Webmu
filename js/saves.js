import { read, write } from './database.js';
import { contentHash } from './importer.js';

export const saveBuild = 'emulatorjs-4.2.3/cores-4.2.3';
export const maxSaveBytes = 32 * 1024 * 1024;

export async function storeSave(game, kind, bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > maxSaveBytes)
    throw Error('This save is empty or too large.');
  const record = {
    id: game.id + ':' + kind,
    gameId: game.id,
    fileId: game.fileId,
    system: game.system,
    kind,
    build: saveBuild,
    updatedAt: Date.now(),
    hash: await contentHash(bytes),
    blob: new Blob([bytes])
  };
  const old = await read('Saves', record.id);
  if (old?.hash !== record.hash) await write([{ store: 'Saves', value: record }]);
  return record;
}

export async function persistBattery(manager, game) {
  const bytes = manager.getSaveFile();
  if (bytes?.length) await storeSave(game, 'battery', new Uint8Array(bytes));
}

export async function restoreBattery(manager, game) {
  const record = await read('Saves', game.id + ':battery');
  if (!record) return;
  checkSave(record, game);
  const bytes = new Uint8Array(await record.blob.arrayBuffer());
  manager.FS.writeFile(manager.getSaveFilePath(), bytes);
  manager.loadSaveFiles();
}

export function checkSave(record, game) {
  if (record.fileId !== game.fileId || record.system !== game.system || record.build !== saveBuild)
    throw Error('This save belongs to a different game or engine version.');
}

export async function exportState(record) {
  const bytes = new Uint8Array(await record.blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return new Blob(
    [
      JSON.stringify({
        format: 'webmu-game-save',
        version: 1,
        fileId: record.fileId,
        system: record.system,
        build: record.build,
        hash: record.hash,
        data: btoa(binary)
      })
    ],
    { type: 'application/json' }
  );
}

export async function importState(file, game) {
  if (file.size > 45 * 1024 * 1024) throw Error('This save file is too large.');
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw Error('Choose a Webmu game save file.');
  }
  if (data?.format !== 'webmu-game-save' || data.version !== 1 || typeof data.data !== 'string')
    throw Error('Choose a Webmu game save file.');
  checkSave(data, game);
  if (data.data.length > Math.ceil(maxSaveBytes / 3) * 4) throw Error('This save is too large.');
  let bytes;
  try {
    bytes = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
  } catch {
    throw Error('This save file is damaged.');
  }
  if (!bytes.length || (await contentHash(bytes)) !== data.hash)
    throw Error('This save file is damaged.');
  return bytes;
}
