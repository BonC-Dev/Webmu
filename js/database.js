export const databaseVersion = 1;
let connection;
export function migrate(database, oldVersion) {
  if (oldVersion < 1) {
    const games = database.createObjectStore('Games', { keyPath: 'id' });
    games.createIndex('fileId', 'fileId', { unique: true });
    for (const name of ['Files', 'Covers', 'Settings', 'Saves'])
      database.createObjectStore(name, { keyPath: 'id' });
  }
}
export function openDatabase() {
  if (connection) return Promise.resolve(connection);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('webmu-library', databaseVersion);
    request.onupgradeneeded = (event) => migrate(request.result, event.oldVersion);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(Error('Another Webmu tab is blocking the storage update. Close that tab and reload.'));
    request.onsuccess = () => {
      connection = request.result;
      connection.onversionchange = () => {
        connection.close();
        connection = null;
      };
      resolve(connection);
    };
  });
}
export async function read(store, id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readonly');
    const request =
      id === undefined
        ? transaction.objectStore(store).getAll()
        : transaction.objectStore(store).get(id);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || Error('Storage read was interrupted.'));
  });
}
export async function write(records, removals = []) {
  const db = await openDatabase();
  const stores = [
    ...new Set([
      ...records.map((record) => record.store),
      ...removals.map((record) => record.store)
    ])
  ];
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, 'readwrite');
    for (const record of records) transaction.objectStore(record.store).put(record.value);
    for (const record of removals) transaction.objectStore(record.store).delete(record.id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || Error('The storage change did not finish.'));
  });
}
export async function removeGame(game) {
  const saves = await read('Saves');
  return write(
    [],
    [
      { store: 'Games', id: game.id },
      { store: 'Files', id: game.fileId },
      { store: 'Covers', id: game.id },
      ...saves
        .filter((save) => save.gameId === game.id)
        .map((save) => ({ store: 'Saves', id: save.id }))
    ]
  );
}
