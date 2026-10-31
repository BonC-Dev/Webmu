const controls = 'Arrows: move · X: A · Z: B · Enter: Start · Shift: Select.';
function system(id, displayName, core, extensions, limitations = '') {
  return {
    id,
    displayName,
    engine: 'emulatorjs',
    coreConfiguration: core,
    suggestedExtensions: extensions,
    acceptedFormats: extensions,
    biosRequirements: [],
    capabilities: {
      keyboardControls: false,
      touchControls: false,
      saveStates: false,
      saveFileExport: false,
      screenshots: false
    },
    supportStatus: 'experimental',
    knownLimitations:
      limitations ||
      'Bundled core; a representative game has not completed the compatibility checklist.',
    controls
  };
}
export const systems = [
  system('gb', 'Game Boy', 'gambatte', ['gb']),
  system('gbc', 'Game Boy Color', 'gambatte', ['gbc']),
  system(
    'gba',
    'Game Boy Advance',
    'mgba',
    ['gba'],
    'Standalone cartridges only. No BIOS file is bundled.'
  ),
  system('nes', 'NES', 'fceumm', ['nes']),
  system('snes', 'SNES', 'snes9x', ['sfc', 'smc']),
  system('sms', 'Master System', 'genesis_plus_gx', ['sms']),
  system('gg', 'Game Gear', 'genesis_plus_gx', ['gg']),
  system('genesis', 'Mega Drive / Genesis', 'genesis_plus_gx', ['md', 'gen', 'bin']),
  {
    id: 'flash',
    displayName: 'Flash',
    engine: 'ruffle',
    coreConfiguration: null,
    suggestedExtensions: ['swf'],
    acceptedFormats: ['swf'],
    biosRequirements: [],
    capabilities: {
      keyboardControls: false,
      touchControls: false,
      saveStates: false,
      saveFileExport: false,
      screenshots: false
    },
    supportStatus: 'experimental',
    knownLimitations:
      'Standalone SWF files only. Networking and JavaScript access are off. Some Flash behavior is unsupported.',
    controls: 'Controls depend on the Flash file. Click the player first.'
  }
];
const checkedDemos = {
  gb: 'Tobu Tobu Girl reached gameplay; original movement and sound tests also checked.',
  gbc: '144p Test Suite v0.23 in Color mode; video and menu input checked.',
  gba: '160p Test Suite v0.23 multiboot demo; video and menu input checked. Regular cartridge games were not part of this check.',
  nes: '240p Test Suite v0.23; video and menu input checked.',
  snes: '240p Test Suite 1.10; video and menu input checked.',
  sms: 'GBDK 4.5.0 controller example; video and keyboard response checked.',
  gg: 'GBDK 4.5.0 controller example; video and keyboard response checked.',
  genesis: '240p Test Suite 1.32; video and menu input checked.',
  flash:
    'Original Color Loop animation and audio example. Networking and JavaScript access are off.'
};
for (const system of systems) {
  system.supportStatus = 'tested demo';
  system.capabilities.keyboardControls = system.id !== 'flash';
  system.capabilities.saveStates = system.id !== 'flash';
  system.capabilities.saveFileExport = system.id !== 'flash';
  system.knownLimitations =
    checkedDemos[system.id] +
    ' Checked on desktop Edge. Console Save/Load was tested with these demos. Other games and mobile gameplay may vary.';
}
// Hardware families use their earliest launch; NES includes Famicom and SMS includes Mark III.
// Flash is a file format, placed at its 1996 debut rather than treated as a console.
const releases = {
  nes: 1983,
  sms: 1985,
  genesis: 1988,
  gb: 1989,
  gg: 1990,
  snes: 1990,
  flash: 1996,
  gbc: 1998,
  gba: 2001
};
for (const system of systems) system.releaseYear = releases[system.id];
export const chronologicalSystems = [...systems].sort(
  (a, b) => a.releaseYear - b.releaseYear || a.id.localeCompare(b.id)
);
export function getSystem(id) {
  return systems.find((system) => system.id === id);
}
export function extension(name) {
  return name.split('.').pop().toLowerCase();
}
export function suggestSystem(name) {
  const ext = extension(name);
  if (ext === 'bin') return '';
  return systems.find((system) => system.suggestedExtensions.includes(ext))?.id || '';
}
