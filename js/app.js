import { read, write, removeGame } from './database.js';
import { importBatch, importFile, validateMetadata } from './importer.js';
import { systems, getSystem, suggestSystem } from './systems.js';
import { selectGames } from './library.js';
import { createPlayer } from './player.js';
import { examples } from './examples.js';
import { exportBackup, prepareBackup, restoreBackup, maxBackupSize } from './backup.js';
import { createSystemBrowser } from './system-browser.js';
import { createRecentGames } from './recent-games.js';
const $ = (id) => document.getElementById(id);
let games = [],
  view = 'all',
  entries = [],
  editing,
  returnFocus,
  locked = false,
  preparedBackup,
  savingGame = false;
const covers = new Map();
const parameters = new URLSearchParams(location.search);
const consoleSystem = getSystem(parameters.get('console'));
const systemBrowser = createSystemBrowser((system) => {
  location.href = system ? '?console=' + encodeURIComponent(system) : './?library=1';
});
const recentGames = createRecentGames(launchGame, coverFor);
function coverFor(game) {
  return (
    covers.get(game.id) ||
    'assets/covers/' +
      (examples.find((example) => example.title === game.title)?.cover ||
        (game.system === 'flash' ? 'color.svg' : 'meadow.svg'))
  );
}
function showLibrary() {
  $('libraryDetails').open = true;
  if (consoleSystem) return;
  $('libraryDetails').scrollIntoView({ block: 'start', behavior: 'instant' });
}
$('libraryOpen').onclick = () => {
  if (consoleSystem) location.href = './?library=1';
  else showLibrary();
};
function say(message, error = false) {
  $('notice').hidden = false;
  $('notice').textContent = message;
  $('notice').classList.toggle('error', error);
}
function button(text, action, className = '') {
  const element = document.createElement('button');
  element.textContent = text;
  element.className = className;
  element.onclick = action;
  return element;
}
function busy(action) {
  return async (event) => {
    if (locked) return;
    locked = true;
    const target = event?.currentTarget;
    if (target instanceof HTMLButtonElement) target.disabled = true;
    try {
      await action(event);
    } catch (error) {
      say(error.message, true);
    } finally {
      locked = false;
      if (target instanceof HTMLButtonElement) target.disabled = false;
    }
  };
}
async function refresh() {
  let records = await read('Games');
  const retired = records.filter(
    (game) =>
      game.example === true &&
      game.fileId === 'a1a7094770018fe3ad7ba479d3a027ce8ec65ecf9875f0f2658523fcbd3afaec'
  );
  if (retired.length) {
    const response = await fetch('assets/examples/Tobu%20Tobu%20Girl.gb');
    if (!response.ok) throw Error('The replacement demo could not load. Your old demo was kept.');
    await importFile(new File([await response.blob()], 'Tobu Tobu Girl.gb'), 'gb', true);
    for (const game of retired) await removeGame(game);
    records = await read('Games');
  }
  games = [];
  let invalid = 0;
  for (const record of records) {
    try {
      validateMetadata(record);
      games.push(record);
    } catch {
      invalid++;
    }
  }
  for (const url of covers.values()) URL.revokeObjectURL(url);
  covers.clear();
  for (const cover of await read('Covers'))
    if (
      cover.blob instanceof Blob &&
      ['image/png', 'image/jpeg', 'image/webp'].includes(cover.blob.type)
    )
      covers.set(cover.id, URL.createObjectURL(cover.blob));
  render();
  recentGames.update(games);
  if (invalid)
    say(
      invalid + ' invalid record(s) were left untouched. Export a backup before trying repairs.',
      true
    );
}
function render() {
  const collection = consoleSystem
    ? games.filter((game) => game.system === consoleSystem.id)
    : games;
  $('allCount').textContent = collection.length;
  $('favoriteCount').textContent = collection.filter((game) => game.favorite).length;
  const labels = { all: 'All games', favorites: 'Favorites', recent: 'Recently played' };
  $('heading').textContent = consoleSystem && view === 'all' ? 'Your games' : labels[view];
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
    button.setAttribute('aria-pressed', String(button.dataset.view === view));
  });
  const selected = selectGames(games, {
    view,
    search: $('search').value,
    system: consoleSystem?.id || $('systemFilter').value,
    sort: $('sort').value
  });
  $('resultCount').textContent = selected.length + ' ' + (selected.length === 1 ? 'game' : 'games');
  $('games').replaceChildren();
  for (const game of selected) {
    const card = document.createElement('article');
    card.className = 'game-card';
    const art = document.createElement('div');
    art.className = 'cover-wrap';
    const image = document.createElement('img');
    image.src = coverFor(game);
    image.alt = '';
    image.className = 'cover';
    image.loading = 'lazy';
    art.append(image);
    const favorite = button(
      game.favorite ? '♥' : '♡',
      busy(async () => {
        await write([{ store: 'Games', value: { ...game, favorite: !game.favorite } }]);
        await refresh();
      }),
      'favorite'
    );
    favorite.setAttribute('aria-label', (game.favorite ? 'Unfavorite ' : 'Favorite ') + game.title);
    favorite.setAttribute('aria-pressed', String(game.favorite));
    art.append(favorite);
    const badge = document.createElement('span');
    badge.className = 'system-chip';
    badge.textContent = getSystem(game.system).displayName;
    art.append(badge);
    const title = document.createElement('h3');
    title.textContent = game.title;
    const meta = document.createElement('p');
    meta.className = 'game-meta';
    meta.textContent = game.example
      ? 'INCLUDED EXAMPLE'
      : game.lastPlayed
        ? 'Played ' + new Date(game.lastPlayed).toLocaleDateString()
        : 'Added ' + new Date(game.addedAt).toLocaleDateString();
    const actions = document.createElement('div');
    actions.className = 'game-actions';
    actions.append(
      button('Play ↗', () => launchGame(game), 'play'),
      button('Edit', () => editGame(game), 'text-button'),
      button(
        'Delete',
        busy(async () => {
          if (confirm('Delete “' + game.title + '” and its local file? Other games will stay.')) {
            await removeGame(game);
            await refresh();
          }
        }),
        'text-button'
      )
    );
    card.append(art, meta, title, actions);
    $('games').append(card);
  }
  $('empty').hidden = selected.length > 0;
  $('empty').querySelector('h2').textContent =
    consoleSystem && !collection.length
      ? 'No games here yet'
      : games.length
        ? 'No games match this view'
        : 'Your library starts here';
  $('empty').querySelector('p').textContent =
    consoleSystem && !collection.length
      ? 'Load a file for ' + consoleSystem.displayName + ' to get started.'
      : games.length
        ? 'Try another search, system or collection.'
        : 'Drop your game files into this area, or choose a file to add. Up to 32 MB each.';
  $('examplesSection').hidden = !!consoleSystem || games.length > 0;
  systemBrowser.update($('systemFilter').value, games);
}
async function launchGame(game) {
  if (player.state !== 'idle') return;
  returnFocus = document.activeElement;
  $('exitPlayer').textContent = consoleSystem
    ? '← ' + consoleSystem.displayName
    : '← Back to library';
  $('playerTitle').textContent = game.title;
  $('playerSystem').textContent = getSystem(game.system).displayName;
  $('playerControls').textContent = getSystem(game.system).controls;
  $('gameSaveControls').hidden = game.system === 'flash';
  $('saveStatus').textContent = '';
  $('importGameSave').value = '';
  $('playerScreen').hidden = false;
  $('main').inert = true;
  $('appHeader').inert = true;
  $('exitPlayer').focus();
  await player.launch(game);
}
const player = createPlayer(
  $('playerContainer'),
  (state, message) => {
    $('playerStatus').textContent =
      message ||
      {
        loading: 'Loading the local engine…',
        running: 'Click inside the game to use its controls.',
        error: 'The game could not start.'
      }[state] ||
      '';
    $('fullscreen').disabled = state !== 'running';
    for (const id of ['saveGame', 'loadGameSave', 'exportGameSave', 'importGameSave'])
      $(id).disabled = state !== 'running';
    if (state === 'idle') {
      $('playerScreen').hidden = true;
      $('main').inert = false;
      $('appHeader').inert = false;
      returnFocus?.focus();
      refresh().catch((error) => say(error.message, true));
    }
  },
  () => refresh().catch((error) => say('Could not refresh play history: ' + error.message, true))
);
async function exitPlayer() {
  if (savingGame) return;
  if (document.fullscreenElement === $('playerScreen')) document.exitFullscreen().catch(() => {});
  await player.close();
}
$('exitPlayer').onclick = exitPlayer;
async function saveAction(action) {
  if (savingGame) return;
  savingGame = true;
  $('exitPlayer').disabled = true;
  for (const id of ['saveGame', 'loadGameSave', 'exportGameSave', 'importGameSave'])
    $(id).disabled = true;
  try {
    $('saveStatus').textContent = await action();
  } catch (error) {
    $('saveStatus').textContent = error.message;
  } finally {
    savingGame = false;
    $('exitPlayer').disabled = false;
    for (const id of ['saveGame', 'loadGameSave', 'exportGameSave', 'importGameSave'])
      $(id).disabled = player.state !== 'running';
  }
}
$('saveGame').onclick = () =>
  saveAction(async () => {
    await player.save();
    return 'Saved on this device.';
  });
$('loadGameSave').onclick = () =>
  saveAction(async () => {
    await player.load();
    return 'Save loaded.';
  });
$('exportGameSave').onclick = () =>
  saveAction(async () => {
    const blob = await player.exportSave();
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = 'webmu-game-save.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'Save downloaded.';
  });
$('importGameSave').onchange = () =>
  saveAction(async () => {
    const file = $('importGameSave').files[0];
    if (!file) return '';
    await player.importSave(file);
    return 'Save imported and loaded.';
  });

$('fullscreen').onclick = () => {
  $('playerScreen')
    .requestFullscreen()
    .catch((error) => say('Fullscreen did not open: ' + error.message, true));
};
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !$('playerScreen').hidden && !document.fullscreenElement)
    exitPlayer();
});
function chooseFiles(files) {
  if (!files.length) return;
  if (files.length > 50) {
    say('Import up to 50 files at once.', true);
    return;
  }
  entries = Array.from(files, (file) => ({
    file,
    system: consoleSystem?.id || suggestSystem(file.name)
  }));
  $('importEntries').replaceChildren();
  $('importResults').replaceChildren();
  $('importProgress').textContent = '';
  for (const entry of entries) {
    const row = document.createElement('label');
    row.className = 'import-row';
    const name = document.createElement('span');
    name.textContent = entry.file.name + ' · ' + (entry.file.size / 1024).toFixed(1) + ' KB';
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'System for ' + entry.file.name);
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Choose a system';
    select.append(empty);
    for (const system of consoleSystem ? [consoleSystem] : systems) {
      const option = document.createElement('option');
      option.value = system.id;
      option.textContent = system.displayName;
      select.append(option);
    }
    select.value = entry.system;
    select.onchange = () => (entry.system = select.value);
    row.append(name, select);
    $('importEntries').append(row);
  }
  $('importDialog').showModal();
}
for (const id of ['importNav', 'emptyImport', 'consoleLoad'])
  $(id).onclick = () => $('files').click();
$('files').onchange = () => {
  chooseFiles($('files').files);
  $('files').value = '';
};
for (const event of ['dragover', 'drop'])
  $('dropZone').addEventListener(event, (e) => {
    e.preventDefault();
    if (event === 'drop') chooseFiles(e.dataTransfer.files);
  });
window.addEventListener('dragover', (event) => {
  if (Array.from(event.dataTransfer.types).includes('Files')) event.preventDefault();
});
window.addEventListener('drop', (event) => {
  if (!$('dropZone').contains(event.target)) event.preventDefault();
});
$('importConfirm').onclick = busy(async () => {
  $('importDialog')
    .querySelectorAll('select,form button')
    .forEach((control) => (control.disabled = true));
  try {
    const result = await importBatch(entries, (index, total, name, message) => {
      const row = document.createElement('p');
      row.textContent = name + ': ' + message;
      $('importResults').append(row);
      $('importProgress').textContent = index + ' / ' + total + ' checked';
    });
    $('importProgress').textContent =
      result.imported +
      ' imported, ' +
      result.duplicates +
      ' duplicates, ' +
      result.failed +
      ' failed.';
    await refresh();
    entries = [];
    if (result.imported) showLibrary();
  } finally {
    $('importDialog')
      .querySelectorAll('select,form button')
      .forEach((control) => (control.disabled = false));
  }
});
function editGame(game) {
  editing = game;
  $('editTitle').value = game.title;
  $('editNotes').value = game.notes || '';
  $('coverInput').value = '';
  $('editError').textContent = '';
  $('editDialog').showModal();
}
$('editClose').onclick = () => $('editDialog').close();
$('editForm').onsubmit = async (event) => {
  event.preventDefault();
  const submit = $('editForm').querySelector('button.primary');
  if (submit.disabled) return;
  submit.disabled = true;
  try {
    const title = $('editTitle').value.trim();
    if (!title) throw Error('Give this game a title.');
    const records = [
      { store: 'Games', value: { ...editing, title, notes: $('editNotes').value.trim() } }
    ];
    const file = $('coverInput').files[0];
    if (file) {
      if (
        file.size > 2 * 1024 * 1024 ||
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
      )
        throw Error('Use a PNG, JPG or WebP image under 2 MB.');
      const bitmap = await createImageBitmap(file);
      if (bitmap.width > 4096 || bitmap.height > 4096) {
        bitmap.close();
        throw Error('Cover dimensions must be 4096 pixels or smaller.');
      }
      bitmap.close();
      records.push({ store: 'Covers', value: { id: editing.id, blob: file } });
    }
    await write(records);
    $('editDialog').close();
    await refresh();
    say('Changes saved.');
  } catch (error) {
    $('editError').textContent = error.message;
  } finally {
    submit.disabled = false;
  }
};
for (const system of systems) {
  const option = document.createElement('option');
  option.value = system.id;
  option.textContent = system.displayName;
  $('systemFilter').append(option);
}
if (consoleSystem) {
  document.body.classList.add('console-view');
  document.title = consoleSystem.displayName + ' · Webmu';
  $('consolePage').hidden = false;
  document.querySelector('.system-browser').hidden = true;
  document.querySelector('.recent-section').hidden = true;
  $('libraryDetails').open = true;
  $('libraryDetails').querySelector('summary').hidden = true;
  $('systemFilter').value = consoleSystem.id;
  $('systemFilter').disabled = true;
  $('systemFilter').closest('label').hidden = true;
  $('consoleTitle').textContent = consoleSystem.displayName;
  $('consoleYear').textContent = consoleSystem.releaseYear;
  $('consoleFormats').textContent =
    consoleSystem.acceptedFormats.map((ext) => '.' + ext).join(', ') + ' files';
  $('files').accept = consoleSystem.acceptedFormats.map((ext) => '.' + ext).join(',');
  $('consoleLogo').src =
    'assets/logos/' + consoleSystem.id + (consoleSystem.id === 'sms' ? '.png' : '.svg');
  $('examplesButton').hidden = !examples.some((example) => example.system === consoleSystem.id);
} else if (parameters.has('library')) {
  $('libraryDetails').open = true;
}
for (const control of ['search', 'systemFilter', 'sort'])
  $(control).addEventListener(control === 'search' ? 'input' : 'change', render);
document.querySelectorAll('[data-view]').forEach(
  (button) =>
    (button.onclick = () => {
      view = button.dataset.view;
      render();
    })
);
async function addExample(example, play = false) {
  const response = await fetch(
    'assets/examples/' + example.file.split('/').map(encodeURIComponent).join('/')
  );
  if (!response.ok) throw Error('The example file could not load.');
  const result = await importFile(
    new File([await response.blob()], example.file.split('/').pop()),
    example.system,
    true
  );
  await refresh();
  const game = result.game || games.find((game) => game.example && game.title === example.title);
  if (play && game) await launchGame(game);
}
for (const example of examples) {
  const card = document.createElement('article');
  card.className = 'game-card example-card';
  const image = document.createElement('img');
  image.className = 'cover';
  image.src = 'assets/covers/' + example.cover;
  image.alt = '';
  const tag = document.createElement('p');
  tag.className = 'game-meta';
  tag.textContent = getSystem(example.system).displayName.toUpperCase() + ' / SAMPLE GAME';
  const title = document.createElement('h3');
  title.textContent = example.title;
  const description = document.createElement('p');
  description.className = 'example-description';
  description.textContent = example.description;
  card.append(
    image,
    tag,
    title,
    description,
    button(
      'Try this example ↗',
      busy(() => addExample(example, true)),
      'play'
    )
  );
  $('examples').append(card);
}
$('examplesButton').onclick = busy(async () => {
  for (const example of examples.filter(
    (example) => !consoleSystem || example.system === consoleSystem.id
  ))
    await addExample(example);
  say('Examples added. Pick one to try the player.');
});
$('homeExamples').onclick = showLibrary;
$('helpOpen').onclick = () => $('helpDialog').showModal();
$('backupOpen').onclick = busy(async () => {
  $('backupDialog').showModal();
  const stores = await Promise.all(['Files', 'Covers', 'Saves'].map((store) => read(store)));
  const bytes = stores.flat().reduce((total, entry) => total + (entry.blob?.size || 0), 0);
  const size =
    bytes < 1024
      ? bytes + ' B'
      : bytes < 1048576
        ? (bytes / 1024).toFixed(1) + ' KB'
        : (bytes / 1048576).toFixed(1) + ' MB';
  $('storageUsage').textContent = 'Games, covers and saves: ' + size + ' on this device.';
});
for (const [id, full] of [
  ['exportMetadata', false],
  ['exportFull', true]
])
  $(id).onclick = busy(async () => {
    try {
      const blob = await exportBackup(full);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        'webmu-' +
        (full ? 'full' : 'metadata') +
        '-' +
        new Date().toISOString().slice(0, 10) +
        '.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      $('restoreSummary').textContent = 'Backup download started.';
    } catch (error) {
      $('restoreSummary').textContent = error.message;
    }
  });
$('restoreInput').onchange = async () => {
  const file = $('restoreInput').files[0];
  preparedBackup = null;
  $('restoreConfirm').hidden = true;
  if (!file) return;
  try {
    if (file.size > maxBackupSize) throw Error('Backups must be 96 MB or smaller.');
    $('restoreSummary').textContent = 'Checking the backup and its file hashes…';
    preparedBackup = await prepareBackup(JSON.parse(await file.text()));
    $('restoreSummary').textContent =
      preparedBackup.backup.gameMetadata.length +
      ' games in this ' +
      preparedBackup.backup.kind +
      ' backup. Existing entries will stay.';
    $('restoreConfirm').hidden = false;
  } catch (error) {
    $('restoreSummary').textContent = 'Could not read this backup: ' + error.message;
  }
};
$('restoreConfirm').onclick = busy(async () => {
  if (!preparedBackup) return;
  const messages = [];
  const result = await restoreBackup(preparedBackup, (message) => messages.push(message));
  $('restoreSummary').textContent =
    result.restored +
    ' restored, ' +
    result.duplicates +
    ' duplicates, ' +
    result.missing +
    ' missing files, ' +
    result.failed +
    ' failed. ' +
    messages.join(' ');
  preparedBackup = null;
  $('restoreConfirm').hidden = true;
  $('restoreInput').value = '';
  await refresh();
});
window.addEventListener('pagehide', () => {
  player.close();
  for (const url of covers.values()) URL.revokeObjectURL(url);
});
async function startLibrary() {
  await refresh();
  await read('Settings', 'starter-games-v1');
  say('Adding the sample games...');
  for (const example of examples) await addExample(example);
  await write([{ store: 'Settings', value: { id: 'starter-games-v1', value: true } }]);
  $('notice').hidden = true;
}
const ready = busy(startLibrary)();
export { refresh, ready };
