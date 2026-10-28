export function getCapabilities() { return {keyboardControls:true,touchControls:false,saveStates:false,saveFileExport:false,screenshots:false}; }
export function launch(game) { return new URL('../../players/ruffle.html', import.meta.url); }
export function close(frame) { frame.remove(); }
