export function getCapabilities() { return {keyboardControls:true,touchControls:true,saveStates:false,saveFileExport:false,screenshots:false}; }
export function launch(game) { return new URL('../../players/emulatorjs.html', import.meta.url); }
export function close(frame) { frame.remove(); }
