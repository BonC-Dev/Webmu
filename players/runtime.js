import { getSystem } from '../js/systems.js';
import { persistBattery, restoreBattery } from '../js/saves.js';
let token;
function notify(type, message = '') {
  parent.postMessage({ app: 'webmu', type, token, message }, location.origin);
}
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = () =>
      reject(Error('The local engine files could not load. Check the vendor folder.'));
    document.body.append(script);
  });
}
window.addEventListener('error', (event) => notify('error', event.message));
window.addEventListener('unhandledrejection', (event) =>
  notify('error', event.reason?.message || 'The engine could not load this game.')
);
window.addEventListener('message', async (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== parent ||
    event.data?.app !== 'webmu' ||
    event.data.type !== 'launch' ||
    token
  )
    return;
  const payload = event.data;
  token = payload.token;
  try {
    const system = getSystem(payload.game.system);
    if (
      !system ||
      !(payload.blob instanceof Blob) ||
      !payload.url.startsWith('blob:' + location.origin + '/')
    )
      throw Error('Invalid player request.');
    if (system.engine === 'emulatorjs') {
      window.EJS_player = '#game';
      window.EJS_core = system.coreConfiguration;
      window.EJS_gameUrl = payload.url;
      // The shared Sega core uses the extension to select SMS or Game Gear mode.
      // Keep a stable hash name, with the chosen system's canonical extension.
      window.EJS_gameName = payload.game.fileId + '.' + system.acceptedFormats[0];
      window.EJS_pathtodata = '../vendor/emulatorjs/data/';
      window.EJS_startOnLoaded = true;
      window.EJS_threads = false;
      window.EJS_disableDatabases = true;
      window.EJS_color = '#c1ed73';
      // The pinned checkout ships upstream source files rather than its optional minified build.
      window.EJS_DEBUG_XX = true;
      const keys = [
        'z',
        'a',
        'shift',
        'enter',
        'up arrow',
        'down arrow',
        'left arrow',
        'right arrow',
        'x',
        's',
        'q',
        'e',
        'tab',
        'r',
        'f',
        'g'
      ];
      const pads = [
        'BUTTON_2',
        'BUTTON_4',
        'SELECT',
        'START',
        'DPAD_UP',
        'DPAD_DOWN',
        'DPAD_LEFT',
        'DPAD_RIGHT',
        'BUTTON_1',
        'BUTTON_3',
        'LEFT_TOP_SHOULDER',
        'RIGHT_TOP_SHOULDER',
        'LEFT_BOTTOM_SHOULDER',
        'RIGHT_BOTTOM_SHOULDER',
        'LEFT_STICK',
        'RIGHT_STICK'
      ];
      window.EJS_defaultControls = {};
      for (let player = 0; player < 4; player++) {
        window.EJS_defaultControls[player] = {};
        for (let key = 0; key < keys.length; key++)
          window.EJS_defaultControls[player][key] = {
            value: player === 0 ? keys[key] : '',
            value2: pads[key]
          };
      }
      window.EJS_onGameStart = async () => {
        const manager = window.EJS_emulator.gameManager;
        let saveWarning;
        try {
          await restoreBattery(manager, payload.game);
        } catch (error) {
          saveWarning = 'Game save could not load: ' + error.message;
        }
        notify('running');
        if (saveWarning) notify('save-error', saveWarning);
        let saving = false;
        setInterval(async () => {
          if (saving) return;
          saving = true;
          try {
            await persistBattery(manager, payload.game);
          } catch (error) {
            notify('save-error', 'Game save could not be stored: ' + error.message);
          } finally {
            saving = false;
          }
        }, 3000);
      };
      await loadScript('../vendor/emulatorjs/data/loader.js');
    } else {
      window.RufflePlayer = {
        config: {
          publicPath: '../vendor/ruffle/',
          allowScriptAccess: false,
          allowNetworking: 'none',
          openUrlMode: 'deny',
          autoplay: 'on',
          unmuteOverlay: 'visible',
          warnOnUnsupportedContent: true
        }
      };
      await loadScript('../vendor/ruffle/ruffle.js');
      const player = window.RufflePlayer.newest().createPlayer();
      document.querySelector('#game').append(player);
      await player.ruffle().load({
        data: new Uint8Array(await payload.blob.arrayBuffer()),
        swfFileName: payload.game.fileId + '.swf',
        allowScriptAccess: false,
        allowNetworking: 'none',
        openUrlMode: 'deny'
      });
      notify('running');
    }
  } catch (error) {
    notify('error', error.message);
  }
});
notify('ready');
