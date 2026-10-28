const controls = 'Arrows: move · X: A · Z: B · Enter: Start · Shift: Select. Engine settings let you change these.';
function system(id, displayName, core, extensions, limitations = '') {
  return {id, displayName, engine:'emulatorjs', coreConfiguration:core, suggestedExtensions:extensions,
    acceptedFormats:extensions, biosRequirements:[], capabilities:{keyboardControls:true,touchControls:true,saveStates:false,saveFileExport:false,screenshots:false},
    supportStatus:'experimental', knownLimitations:limitations || 'Bundled core; a representative game has not completed the compatibility checklist.', controls};
}
export const systems = [
  system('gb','Game Boy','gambatte',['gb']),
  system('gbc','Game Boy Color','gambatte',['gbc']),
  system('gba','Game Boy Advance','mgba',['gba'],'Standalone cartridges only. No BIOS file is bundled.'),
  system('nes','NES','fceumm',['nes']),
  system('snes','SNES','snes9x',['sfc','smc']),
  system('sms','Master System','genesis_plus_gx',['sms']),
  system('gg','Game Gear','genesis_plus_gx',['gg']),
  system('genesis','Mega Drive / Genesis','genesis_plus_gx',['md','gen','bin']),
  {id:'flash',displayName:'Flash',engine:'ruffle',coreConfiguration:null,suggestedExtensions:['swf'],acceptedFormats:['swf'],biosRequirements:[],
    capabilities:{keyboardControls:true,touchControls:false,saveStates:false,saveFileExport:false,screenshots:false},supportStatus:'experimental',
    knownLimitations:'Standalone SWF files only. Networking and JavaScript access are off. Some Flash behavior is unsupported.',controls:'Controls depend on the Flash file. Click the player first.'}
];
export function getSystem(id) { return systems.find(system => system.id === id); }
export function extension(name) { return name.split('.').pop().toLowerCase(); }
export function suggestSystem(name) {
  const ext = extension(name);
  if (ext === 'bin') return '';
  return systems.find(system => system.suggestedExtensions.includes(ext))?.id || '';
}
