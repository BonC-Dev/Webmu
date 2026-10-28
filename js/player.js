import {read, write} from './database.js';
import {getSystem} from './systems.js';
import * as emulatorjs from './engines/emulatorjs.js';
import * as ruffle from './engines/ruffle.js';
export const transitions={idle:['loading'],loading:['running','error'],running:['closing','error'],closing:['idle'],error:['closing']};
export function canTransition(from,to) {return transitions[from]?.includes(to) || false;}
export function createPlayer(container, onState) {
  let state='idle',frame,url,timer,token,adapter,active;
  function setState(next,message='') {
    if (!canTransition(state,next)) throw Error('Invalid player state change: '+state+' to '+next);
    state=next;onState(state,message);
  }
  async function receive(event) {
    if (event.origin!==location.origin || event.source!==frame?.contentWindow || event.data?.app!=='webmu' || !['loading','running'].includes(state)) return;
    const message=event.data;
    if (message.type==='ready' && state==='loading' && !message.token) {
      frame.contentWindow.postMessage({app:'webmu',type:'launch',game:active.game,blob:active.file.blob,url,token},location.origin);
      return;
    }
    if (message.token!==token) return;
    if (message.type==='running' && state==='loading') {
      clearTimeout(timer);setState('running');
      try {const latest=await read('Games',active.game.id);if(latest) await write([{store:'Games',value:{...latest,lastPlayed:Date.now()}}]);}
      catch (error) {onState(state,'Playing, but the played date could not be saved: '+error.message);}
    } else if (message.type==='error') {clearTimeout(timer);setState('error',String(message.message).slice(0,400));}
  }
  return {
    get state() {return state;},
    getCapabilities() {return adapter?.getCapabilities() || {};},
    async launch(game) {
      if (state!=='idle') return false;
      setState('loading');const launchToken=crypto.randomUUID();token=launchToken;
      try {
        const file=await read('Files',game.fileId);
        if (token!==launchToken || state!=='loading') return false;
        if (!file?.blob) throw Error('This game file is missing. Import the original file again or restore a full backup.');
        const system=getSystem(game.system);if(!system) throw Error('This system is not available.');
        active={game,file};adapter=system.engine==='ruffle'?ruffle:emulatorjs;
        url=URL.createObjectURL(file.blob);frame=document.createElement('iframe');
        frame.title=game.title+' player';frame.allow='autoplay; fullscreen; gamepad';
        frame.src=adapter.launch(game);window.addEventListener('message',receive);container.replaceChildren(frame);
        timer=setTimeout(()=>{if(state==='loading')setState('error','The engine took too long to start. Return to the library and try again.');},45000);
        return true;
      } catch (error) {if(token===launchToken && state==='loading')setState('error',error.message);return false;}
    },
    close() {
      if (state==='idle' || state==='closing') return;
      setState('closing');token=null;clearTimeout(timer);window.removeEventListener('message',receive);
      if(frame)adapter.close(frame);if(url)URL.revokeObjectURL(url);
      frame=null;url=null;active=null;container.replaceChildren();setState('idle');
    }
  };
}
