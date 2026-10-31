# Third-party software

Webmu's application code is separate from the browser engines under `vendor/`. The MIT license for original Webmu code does not relicense those components.

## EmulatorJS

- Version: **4.2.3**, commit `e150dc0491ae747028919fb82d6598954976ede6`.
- Source: https://github.com/EmulatorJS/EmulatorJS/tree/e150dc0491ae747028919fb82d6598954976ede6
- License: GNU GPL version 3, retained in `vendor/emulatorjs/LICENSE`.
- Location: `vendor/emulatorjs/data/`.
- **Local modification:** the constructor's `checkForUpdates()` call is replaced by a comment, so the pinned local build does not contact a remote version endpoint. The complete modified source is included in `data/src/emulator.js`. `scripts/vendor.py` reproduces this one-line patch and records upstream and modified hashes in `vendor/manifest.json`.
- The loader uses its upstream source-file mode, `EJS_DEBUG_XX`, instead of an absent minified bundle. No core binary was modified. Threads and netplay are not enabled.

The upstream frontend includes its own supporting scripts and icon notices. Those notices remain in place. They include nipplejs, socket.io-client, compression tools and Font Awesome icon attribution. The file hashes identify the exact vendored sources; no build step removes their comments or licenses. Use the upstream source tree and retained headers for per-file terms.

## Console core packages

All five packages are pinned to **4.2.3** from the npm registry. Versioned package metadata is retained in `vendor/packages/`. Single-threaded and legacy variants supplied by those packages are retained without modification. The individual core's own version can differ from its npm package version.

The original license, `core.json` and `build.json` files are extracted directly from each supplied binary archive into `vendor/licenses/<core>/`. They are also still present inside the unmodified `.data` archives. The build configuration and upstream project URLs are included there. Build tooling: https://github.com/EmulatorJS/build

| Core            | Upstream source                                 | Retained notice                                                            |
| --------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| gambatte        | https://github.com/EmulatorJS/gambatte-libretro | `vendor/licenses/gambatte/license.txt` (GPL v2 text)                       |
| mgba            | https://github.com/EmulatorJS/mgba              | `vendor/licenses/mgba/license.txt` (MPL 2.0 text)                          |
| fceumm          | https://github.com/EmulatorJS/libretro-fceumm   | `vendor/licenses/fceumm/license.txt` (GPL v2 text)                         |
| snes9x          | https://github.com/EmulatorJS/snes9x            | `vendor/licenses/snes9x/license.txt` (Snes9x terms)                        |
| genesis_plus_gx | https://github.com/EmulatorJS/Genesis-Plus-GX   | `vendor/licenses/genesis_plus_gx/license.txt` (custom noncommercial terms) |

Snes9x and Genesis Plus GX include restrictions beyond the app's MIT license. Read the complete retained notices before redistribution or commercial use. This local build does not create a public release or grant rights to game files. For the core's own source repository and format list, `core.json` is the direct record shipped with that binary.

## Ruffle

- Version: **0.7.1**, package `@ruffle-rs/ruffle`.
- Source: https://github.com/ruffle-rs/ruffle/tree/v0.7.1
- Website: https://ruffle.rs/
- License: MIT OR Apache-2.0. Both `LICENSE_MIT` and `LICENSE_APACHE` are retained in `vendor/ruffle/`.
- Location: `vendor/ruffle/`. JavaScript, WebAssembly files, source maps and package notices are unmodified.

Webmu creates and loads a Ruffle player through its public API. Flash networking, outbound URLs and JavaScript access are disabled in the adapter. That limits files which need companion resources or external services.

## Development tools

These are development dependencies, not browser runtime requirements:

- `fake-indexeddb` **6.2.4**, Apache-2.0, https://github.com/dumbmatter/fakeIndexedDB
- `playwright-core` **1.62.1**, Apache-2.0, https://github.com/microsoft/playwright
- `prettier` **3.6.2**, MIT, https://github.com/prettier/prettier

The npm lockfile pins their resolved packages and integrity values. Their license files remain in their installed packages. Python `py7zr` **1.0.0** is only used by the optional dependency rebuilding script to extract the core notices; it is not shipped as application code.

## Original examples and artwork

See `assets/examples/README.md`. The original program source and illustrations use Webmu's MIT license. The standard cartridge compatibility logo bytes retain their respective rights. System and product names identify compatibility; this project is not affiliated with their owners.

## System logos

The current system chooser uses locally downloaded Wikimedia Commons logo files. They are not original Webmu artwork and are not covered by its MIT license. The linked Commons file pages mark these text/geometric logos as PD-textlogo and identify their trademark owners and contributor history. Nintendo, Sega and Adobe retain their trademarks; the logos identify file compatibility and do not imply affiliation. Files are unchanged and displayed in their original colors on a neutral backing. Download URLs and SHA-256 checksums are in `assets/logos/sources.json`.

- [gb logo source](https://commons.wikimedia.org/wiki/File:Gameboy_logo.svg) · `assets/logos/gb.svg`
- [gbc logo source](https://commons.wikimedia.org/wiki/File:Game_Boy_Color_logo.svg) · `assets/logos/gbc.svg`
- [gba logo source](https://commons.wikimedia.org/wiki/File:Game_Boy_Advance_logo.svg) · `assets/logos/gba.svg`
- [nes logo source](https://commons.wikimedia.org/wiki/File:NES_logo.svg) · `assets/logos/nes.svg`
- [snes logo source](https://commons.wikimedia.org/wiki/File:Super_Nintendo_Entertainment_System_logo.svg) · `assets/logos/snes.svg`
- [sms logo source](https://commons.wikimedia.org/wiki/File:Sega-master-system-logo.png) · `assets/logos/sms.png`
- [gg logo source](https://commons.wikimedia.org/wiki/File:Game_gear_eu_logo.svg) · `assets/logos/gg.svg`
- [genesis logo source](https://commons.wikimedia.org/wiki/File:Sega_genesis_logo.svg) · `assets/logos/genesis.svg`
- [flash logo source](https://commons.wikimedia.org/wiki/File:Adobe_Flash_Player_32.svg) · `assets/logos/flash.svg`

# Test-only homebrew downloads

The optional system checks download official 240p Test Suite releases and build GBDK controller examples into the ignored `.runtime/compat` directory. These files and the SDK are not bundled with Webmu's built-in demos or covered by the original app's MIT license. Source URLs, upstream licensing details and exact hashes are recorded in [HOMEBREW_TESTS.md](HOMEBREW_TESTS.md) and `tests/system-fixtures.json`. Downloaded archives retain their own notices.

## Tobu Tobu Girl

Tobu Tobu Girl is an arcade platformer by **Tangram Games**, copyright 2017, with music by **potato-tan**. It is included as a local Game Boy demo, replacing Pocket Meadow.

- Official release: https://tangramgames.itch.io/tobutobugirl
- Source: https://github.com/SimonLarsen/tobutobugirl/tree/048a22c2d7ebbe25811322e8692803fa86bb643a
- Code license: MIT, retained with its copyright in `assets/examples/tobu/LICENSE`.
- All art, text, sound and music: Creative Commons Attribution 4.0 International, https://creativecommons.org/licenses/by/4.0/.
- ROM bytes are unchanged. The demo cover and playback screenshots are captures of the game in Webmu. The original app's MIT license does not relicense this artwork or music.
- Download identification and checksums: `assets/examples/tobu/source.json`. Upstream readmes are retained beside it.

## Additional sample games

See [the game credits](assets/examples/README.md) and [manifest](assets/examples/games.json) for the nine games, their authors, asset licenses, notices and source. Game files keep their own licenses. Thwaite's matching GPL source is bundled alongside its license.
