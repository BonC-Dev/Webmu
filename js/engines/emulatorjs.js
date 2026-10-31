import { getSystem } from '../systems.js';
export function getCapabilities(game) {
  return getSystem(game.system).capabilities;
}
export function launch(game) {
  return new URL('../../players/emulatorjs.html', import.meta.url);
}
export function close(frame) {
  frame.remove();
}
