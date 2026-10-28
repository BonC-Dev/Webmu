import {getSystem} from '../js/systems.js';
let token;
function notify(type, message='') { parent.postMessage({app:'webmu',type,token,message},location.origin); }
function loadScript(url) {
  return new Promise((resolve,reject) => {const script=document.createElement('script');script.src=url;script.onload=resolve;script.onerror=()=>reject(Error('The local engine files could not load. Check the vendor folder.'));document.body.append(script);});
}
window.addEventListener('error', event => notify('error',event.message));
window.addEventListener('unhandledrejection', event => notify('error',event.reason?.message || 'The engine could not load this game.'));
window.addEventListener('message', async event => {
  if (event.origin!==location.origin || event.source!==parent || event.data?.app!=='webmu' || event.data.type!=='launch' || token) return;
  const payload=event.data;token=payload.token;
  try {
    const system=getSystem(payload.game.system);
    if (!system || !(payload.blob instanceof Blob) || !payload.url.startsWith('blob:'+location.origin+'/')) throw Error('Invalid player request.');
    if (system.engine==='emulatorjs') {
      window.EJS_player='#game';window.EJS_core=system.coreConfiguration;
      window.EJS_gameUrl=payload.url;window.EJS_gameName=payload.game.fileId;
      window.EJS_pathtodata='../vendor/emulatorjs/data/';window.EJS_startOnLoaded=true;
      window.EJS_threads=false;window.EJS_disableDatabases=true;window.EJS_color='#c1ed73';
      // The pinned checkout ships upstream source files rather than its optional minified build.
      window.EJS_DEBUG_XX=true;
      window.EJS_onGameStart=()=>notify('running');
      await loadScript('../vendor/emulatorjs/data/loader.js');
    } else {
      window.RufflePlayer={config:{publicPath:'../vendor/ruffle/',allowScriptAccess:false,allowNetworking:'none',openUrlMode:'deny',autoplay:'on',unmuteOverlay:'visible',warnOnUnsupportedContent:true}};
      await loadScript('../vendor/ruffle/ruffle.js');
      const player=window.RufflePlayer.newest().createPlayer();document.querySelector('#game').append(player);
      await player.ruffle().load({data:new Uint8Array(await payload.blob.arrayBuffer()),allowScriptAccess:false,allowNetworking:'none',openUrlMode:'deny'});
      notify('running');
    }
  } catch (error) {notify('error',error.message);}
});
notify('ready');
