import { extension, getSystem, suggestSystem } from './systems.js';
import { read, write } from './database.js';
export const maxFileSize = 32 * 1024 * 1024;
export async function contentHash(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export function validateFile(name, bytes, systemId) {
  const system = getSystem(systemId);
  if (!system) throw Error('Choose a system for this file.');
  if (!bytes.byteLength) throw Error('This file is empty.');
  if (bytes.byteLength > maxFileSize) throw Error('Files must be 32 MB or smaller.');
  if (!system.acceptedFormats.includes(extension(name)))
    throw Error(
      'That file extension does not match the selected system. Archives and disc sets are not supported.'
    );
  const data = new Uint8Array(bytes);
  if (
    systemId === 'nes' &&
    !(data[0] === 78 && data[1] === 69 && data[2] === 83 && data[3] === 26 && data.length >= 16)
  )
    throw Error('The NES header is missing.');
  if (['gb', 'gbc'].includes(systemId)) {
    if (data.length < 32768) throw Error('This is too small for a standalone Game Boy cartridge.');
    let checksum = 0;
    for (let index = 0x134; index <= 0x14c; index++) checksum = (checksum - data[index] - 1) & 255;
    if (checksum !== data[0x14d]) throw Error('The Game Boy header checksum does not match.');
  }
  if (systemId === 'gba' && (data.length < 192 || data[0xb2] !== 0x96))
    throw Error('The Game Boy Advance header is missing.');
  if (systemId === 'flash') {
    const signature = String.fromCharCode(...data.slice(0, 3));
    if (!['FWS', 'CWS', 'ZWS'].includes(signature) || data.length < 8)
      throw Error('This is not a supported SWF header.');
    const length = new DataView(bytes).getUint32(4, true);
    if (length < 8 || length > 64 * 1024 * 1024 || (signature === 'FWS' && length !== data.length))
      throw Error('The SWF length is invalid or exceeds the 64 MB expanded limit.');
  }
  return system;
}
export function validateMetadata(game) {
  if (
    !game ||
    typeof game.id !== 'string' ||
    !game.id ||
    game.id.length > 100 ||
    typeof game.title !== 'string' ||
    !game.title.trim() ||
    game.title.length > 120 ||
    !getSystem(game.system) ||
    !/^[a-f0-9]{64}$/.test(game.fileId) ||
    !Number.isFinite(game.addedAt) ||
    typeof game.favorite !== 'boolean' ||
    !(game.lastPlayed === null || Number.isFinite(game.lastPlayed)) ||
    (game.notes !== undefined && (typeof game.notes !== 'string' || game.notes.length > 1000)) ||
    (game.example !== undefined && typeof game.example !== 'boolean')
  )
    throw Error('A game record has invalid metadata.');
  return game;
}
export async function importFile(file, systemId, example = false) {
  if (file.size > maxFileSize) throw Error('Files must be 32 MB or smaller.');
  const bytes = await file.arrayBuffer();
  validateFile(file.name, bytes, systemId);
  const hash = await contentHash(bytes);
  const games = await read('Games');
  const existing = games.find((game) => game.fileId === hash);
  if (existing) {
    if (!(await read('Files', hash))?.blob) {
      await write([
        {
          store: 'Files',
          value: { id: hash, name: file.name, blob: new Blob([bytes]), size: file.size }
        }
      ]);
      return { game: existing, repaired: true };
    }
    return { duplicate: true, game: existing };
  }
  const game = {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.[^.]+$/, '').slice(0, 120),
    system: systemId,
    fileId: hash,
    favorite: false,
    addedAt: Date.now(),
    lastPlayed: null,
    example
  };
  await write([
    {
      store: 'Files',
      value: { id: hash, name: file.name, blob: new Blob([bytes]), size: file.size }
    },
    { store: 'Games', value: game }
  ]);
  return { game };
}
export async function importBatch(entries, report) {
  const result = { imported: 0, duplicates: 0, failed: 0 };
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    try {
      const imported = await importFile(entry.file, entry.system || suggestSystem(entry.file.name));
      if (imported.duplicate) result.duplicates++;
      else result.imported++;
      report(
        index + 1,
        entries.length,
        entry.file.name,
        imported.duplicate ? 'Already in your library.' : 'Imported.'
      );
    } catch (error) {
      result.failed++;
      report(index + 1, entries.length, entry.file.name, error.message);
    }
  }
  return result;
}
