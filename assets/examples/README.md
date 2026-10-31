# Included games

These games are bundled under their own licenses. They are not original Webmu games. The first visit adds all nine games to the browser library. Deleted samples stay deleted; **Try demos** can add them again. Nothing is uploaded.

| System | Game and creator | License |
| --- | --- | --- |
| gb | [Tobu Tobu Girl](https://tangramgames.itch.io/tobutobugirl), Tangram Games; music by potato-tan | MIT code; CC BY 4.0 assets |
| gbc | [Tobu Tobu Girl Deluxe](https://tangramgames.itch.io/tobu-tobu-girl-deluxe), Tangram Games; music by potato-tan | MIT code; CC BY 4.0 assets |
| gba | [Nonogram Advance](https://github.com/emmabritton/gba_nonogram_advance), Emma Britton | MIT game; MPL 2.0 agb library |
| nes | [Thwaite](https://github.com/pinobatch/thwaite-nes), Damian Yerrick; additional music by Beethoven | GPL-3.0-or-later; some permissive components |
| snes | [Gothicvania](https://github.com/donth77/snes-homebrew), TomD; art by ansimuz | MIT code and audio; CC0 art |
| sms | [Balloon Master](https://github.com/joergsf4/balloon-master), Joergsf4 | MIT; public domain melody arrangements |
| gg | [Kaiju Feeder](https://www.smspower.org/Homebrew/KaijuFeeder-GG), Zalo; Game Gear port by toxa | MIT, declared on the release page |
| genesis | [Miniplanets](https://sik.itch.io/miniplanets), Sik / Javier Degirolmo | zlib, including Echo sound driver |
| flash | [Mode](https://github.com/AdamAtomic/Mode), Adam Atomic Saltsman; music by Danny Baranowsky | MIT |

The ROMs are unchanged official downloads, except Kaiju Feeder, built from unmodified upstream source. The GBC and Genesis downloads only have their filename extensions changed. Covers are captures from Webmu and keep the game asset licenses.

For both Tobu games, Tangram Games created the game and potato-tan created the music. Art, text, sound and music use [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). ROM contents are unchanged. The MIT code notices are included in `tobu/` and `licenses/tobutobugirl-dx/`.

Thwaite uses GPL 3 or later. Its complete matching v0.04 source archive is bundled at [licenses/thwaite/source-v0.04.zip](licenses/thwaite/source-v0.04.zip), with its build instructions and copyright notices. It can be shared and changed under those terms and comes without a warranty. The GPL applies to that game, not the separate Webmu app.

Nonogram Advance uses the MPL 2.0 licensed agb library; its license, declared-version source archive and source link are included under `licenses/gba_nonogram_advance/`.

Gothicvania uses TomD's MIT code and audio, with ansimuz's CC0 GothicVania Cemetery artwork. Miniplanets is the classic version, not REMIX, with the zlib licensed Echo driver.

Kaiju Feeder's Game Gear release page declares MIT. Its repository does not contain a separate game license file, so the release declaration is recorded in `licenses/kaiju-feeder/NOTICE.txt`. Original creator Zalo and port author toxa are credited. The source archive and CrossZGB license are included. It was built with CrossZGB v2026.1 using `make gg` in `src`, with `ZGB_PATH` pointing at `ZGB/common` and `GBDK_HOME` at `gbdk`. Game source was not changed.

[games.json](games.json) records sources, hashes, sizes and notice directories. Keep the notices and source archive with the games if sharing this project. These picks allow redistribution under the listed terms, rather than being copyright free.

Night Walk, Little Orchard, Pocket Meadow and Color Loop remain developer fixtures under Webmu's MIT license. They are no longer offered as sample games. Existing user library entries are kept. The earlier built-in Pocket Meadow replacement still imports Tobu before removing the retired built-in entry; ordinary user imports are untouched.
