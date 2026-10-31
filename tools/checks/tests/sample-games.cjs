const artifactPath = require('../scripts/test-paths.cjs');
const emptyLibrary = require('./empty-library.cjs');
const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const fixtures = JSON.parse(fs.readFileSync('assets/examples/games.json', 'utf8')).map((game) => ({
  ...game,
  file: 'assets/examples/' + game.file
}));
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const results = [];
  fs.mkdirSync(artifactPath('test-results/sample-games'), { recursive: true });
  try {
    for (const fixture of fixtures.filter(
      (item) =>
        !process.env.WEBMU_SYSTEMS || process.env.WEBMU_SYSTEMS.split(',').includes(item.system)
    )) {
      const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
      await context.addInitScript(() => {
        window.__audioPeak = 0;
        const connect = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function (target, ...args) {
          const result = connect.call(this, target, ...args);
          if (target instanceof AudioDestinationNode) {
            const meter = this.context.createAnalyser();
            meter.fftSize = 256;
            connect.call(this, meter);
            setInterval(() => {
              const data = new Uint8Array(256);
              meter.getByteTimeDomainData(data);
              for (const value of data)
                window.__audioPeak = Math.max(window.__audioPeak, Math.abs(value - 128));
            }, 20);
          }
          return result;
        };
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
      });
      const bytes = fs.readFileSync(fixture.file);
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== fixture.sha256)
        throw Error('Unexpected fixture hash: ' + fixture.file);
      const result = {
        testedAt: new Date().toISOString(),
        system: fixture.system,
        fixture: fixture.file,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        errors
      };
      try {
        await page.goto(process.env.WEBMU_URL || 'http://127.0.0.1:54120/');
        await emptyLibrary(page);
        await page.locator('#files').setInputFiles({
          name: fixture.name || path.basename(fixture.file),
          mimeType: 'application/octet-stream',
          buffer: bytes
        });
        await page.locator('#importEntries select').selectOption(fixture.system);
        await page.locator('#importConfirm').click();
        await page.getByRole('button', { name: 'Close import', exact: true }).click();
        await page
          .locator('#games article')
          .getByRole('button', { name: 'Play', exact: false })
          .click();
        await page.waitForFunction(
          () => {
            const message = document.querySelector('#playerStatus').textContent;
            return (
              message.startsWith('Click inside') ||
              document.querySelector('#playerScreen').dataset.state === 'error'
            );
          },
          null,
          { timeout: 50000 }
        );
        result.status = await page.locator('#playerStatus').textContent();
        if (!result.status.startsWith('Click inside')) throw Error(result.status);
        const frame = page.frames().find((frame) => frame.url().includes('/players/'));
        const canvas = frame.locator('canvas').first();
        await canvas.waitFor();
        await page.waitForTimeout(3000);
        await canvas.click();
        await page.waitForTimeout(6000);
        const keys = {
          gb: ['Enter', 'Enter', 'Enter'],
          gbc: ['Enter', 'Enter', 'Enter'],
          gba: ['Enter', 'x', 'x'],
          nes: ['Enter', 'Enter'],
          snes: ['Enter', 'x'],
          sms: ['z'],
          gg: ['Enter'],
          genesis: ['Enter', 'Enter', 'Enter']
        };
        if (fixture.system === 'flash') {
          const bounds = await canvas.boundingBox();
          const position = { x: bounds.width * 0.3, y: bounds.height * 0.69 };
          await canvas.hover({ position });
          await page.waitForTimeout(200);
          await canvas.click({ position, delay: 180 });
          await page.waitForTimeout(1200);
          await canvas.click({ position, delay: 180 });
          await page.keyboard.down('x');
          await page.keyboard.down('c');
          await page.waitForTimeout(180);
          await page.keyboard.up('c');
          await page.keyboard.up('x');
        } else {
          for (const key of keys[fixture.system]) {
            await page.keyboard.press(key, { delay: 140 });
            await page.waitForTimeout(1600);
          }
        }
        if (fixture.system === 'gg') {
          await page.waitForTimeout(10000);
          await page.keyboard.press('Enter', { delay: 180 });
          await page.waitForTimeout(6000);
        } else if (fixture.system === 'sms') {
          await page.keyboard.press('x', { delay: 140 });
          await page.keyboard.down('ArrowUp');
          await page.waitForTimeout(700);
          await page.keyboard.up('ArrowUp');
        } else if (['gbc', 'genesis'].includes(fixture.system)) {
          await page.waitForTimeout(8000);
          await page.keyboard.press('Enter', { delay: 180 });
          await page.waitForTimeout(1000);
          await page.keyboard.press('x', { delay: 180 });
        }
        await page.waitForTimeout(1000);
        const before = await canvas.screenshot();
        if (fixture.system !== 'gb') {
          if (fixture.system === 'flash')
            fs.writeFileSync(artifactPath('assets/covers/sample-flash.png'), before);
          else {
            const capture = await frame.evaluate(async () =>
              Array.from(await window.EJS_emulator.gameManager.screenshot())
            );
            fs.writeFileSync(
              artifactPath('assets/covers/sample-') + fixture.system + '.png',
              Buffer.from(capture)
            );
          }
        }
        result.video = await page.evaluate(async (base64) => {
          const image = await createImageBitmap(
            await (await fetch('data:image/png;base64,' + base64)).blob()
          );
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0);
          const data = ctx.getImageData(
            Math.floor(canvas.width * 0.2),
            Math.floor(canvas.height * 0.2),
            Math.floor(canvas.width * 0.6),
            Math.floor(canvas.height * 0.5)
          ).data;
          const colors = new Set();
          let lit = 0;
          for (let i = 0; i < data.length; i += 16) {
            colors.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]);
            if (Math.max(data[i], data[i + 1], data[i + 2]) > 20) lit++;
          }
          return {
            width: image.width,
            height: image.height,
            sampledColors: colors.size,
            litFraction: lit / Math.ceil(data.length / 16)
          };
        }, before.toString('base64'));
        if (result.video.litFraction < 0.02) throw Error('No recognizable video output');
        await canvas.click();
        await page.keyboard.down('ArrowDown');
        await page.waitForTimeout(180);
        const after = await canvas.screenshot();
        await page.keyboard.up('ArrowDown');
        result.imageChangedAfterInput = !before.equals(after);
        if (!result.imageChangedAfterInput) throw Error('No visible input response');
        fs.writeFileSync(
          artifactPath('test-results/sample-games/') + fixture.system + '-before.png',
          before
        );
        fs.writeFileSync(
          artifactPath('test-results/sample-games/') + fixture.system + '-after.png',
          after
        );
        result.audioPeak = await frame.evaluate(() => window.__audioPeak);
        if (fixture.system !== 'flash') {
          await frame.evaluate(() => window.EJS_emulator.pause(true));
          await page.locator('#saveGame').click();
          await page.waitForFunction(
            () => document.querySelector('#saveStatus').textContent === 'Saved on this device.'
          );
          const imageData = async () => {
            const image = Buffer.from(await frame.evaluate(async () => {
              const engine = window.EJS_emulator;
              const play = engine.__sampleOriginalPlay || engine.play.bind(engine);
              play(true);
              try {
                return Array.from(await engine.gameManager.screenshot());
              } finally {
                engine.pause(true);
              }
            }));
            return page.evaluate(async (base64) => {
              const bitmap = await createImageBitmap(
                await (await fetch('data:image/png;base64,' + base64)).blob()
              );
              const out = document.createElement('canvas');
              out.width = 192;
              out.height = 120;
              const ctx = out.getContext('2d');
              ctx.drawImage(bitmap, 0, 0, out.width, out.height);
              return [...ctx.getImageData(0, 0, out.width, Math.floor(out.height * 0.85)).data];
            }, image.toString('base64'));
          };
          const expected = await imageData();
          await frame.evaluate(() => {
            window.EJS_emulator.gameManager.restart();
            window.EJS_emulator.play(true);
          });
          await page.waitForTimeout(600);
          await frame.evaluate(() => window.EJS_emulator.pause(true));
          const changed = await imageData();
          // Render a couple of restored frames, then pause. This keeps scrolling
          // scenes comparable instead of letting the browser's polling delay move them.
          await frame.evaluate(() => {
            const engine = window.EJS_emulator;
            const play = engine.play.bind(engine);
            engine.__sampleOriginalPlay = play;
            engine.play = (...args) => {
              const result = play(...args);
              setTimeout(() => engine.pause(true), 32);
              return result;
            };
          });
          await page.locator('#loadGameSave').click();
          await page.waitForFunction(
            () => document.querySelector('#saveStatus').textContent === 'Save loaded.'
          );
          await page.waitForTimeout(100);
          await frame.evaluate(() => window.EJS_emulator.pause(true));
          // Camera pans and animated text can move between restored frames. Require the saved scene to be much closer than the reset scene, and verify imported bytes separately.
          const similarity = (pixels, target = expected) =>
            pixels.reduce((n, x, i) => n + (Math.abs(x - target[i]) < 4 ? 1 : 0), 0) /
            target.length;
          result.beforeLoadSimilarity = similarity(changed);
          result.afterLoadSimilarity = similarity(await imageData());
          result.stateRestored =
            result.afterLoadSimilarity > 0.85 &&
            result.afterLoadSimilarity > result.beforeLoadSimilarity + 0.05;
          if (!result.stateRestored) throw Error('Saved screen was not restored after restarting');
          await frame.evaluate(() => {
            window.EJS_emulator.play = window.EJS_emulator.__sampleOriginalPlay;
          });
          await page.locator('#gameSaveControls summary').click();
          const download = page.waitForEvent('download');
          await page.locator('#exportGameSave').click();
          const file = await download;
          const exported =
            artifactPath('test-results/sample-games/') + fixture.system + '-save.json';
          await file.saveAs(exported);
          const exportedExpected = await imageData();
          const exportedHash = JSON.parse(fs.readFileSync(exported, 'utf8')).hash;
          await frame.evaluate(() => {
            window.EJS_emulator.gameManager.restart();
            window.EJS_emulator.play(true);
          });
          await page.waitForTimeout(500);
          await frame.evaluate(() => {
            const engine = window.EJS_emulator;
            const play = engine.play.bind(engine);
            engine.play = (...args) => {
              const result = play(...args);
              setTimeout(() => engine.pause(true), 32);
              return result;
            };
          });
          await frame.evaluate(() => {
            const manager = window.EJS_emulator.gameManager;
            const load = manager.loadState.bind(manager);
            manager.loadState = (bytes) => {
              window.__sampleImportedHash = crypto.subtle
                .digest('SHA-256', bytes)
                .then((hash) =>
                  Array.from(new Uint8Array(hash), (byte) =>
                    byte.toString(16).padStart(2, '0')
                  ).join('')
                );
              return load(bytes);
            };
          });
          await page.locator('#importGameSave').setInputFiles(exported);
          await page.waitForFunction(
            () => document.querySelector('#saveStatus').textContent === 'Save imported and loaded.'
          );
          await page.locator('#gameSaveControls summary').click();
          await page.waitForTimeout(150);
          await frame.evaluate(() => window.EJS_emulator.pause(true));
          result.stateFileSimilarity = similarity(await imageData(), exportedExpected);
          result.importedPayloadMatches =
            (await frame.evaluate(() => window.__sampleImportedHash)) === exportedHash;
          result.stateFileRoundTrip =
            result.importedPayloadMatches &&
            result.stateFileSimilarity > 0.85 &&
            result.stateFileSimilarity > result.beforeLoadSimilarity;
          if (!result.stateFileRoundTrip)
            throw Error('Imported save did not restore the saved screen');
        }
        await page.locator('#exitPlayer').click();
        await page.waitForFunction(
          () => document.querySelectorAll('#playerContainer iframe').length === 0
        );
        result.cleanExit = (await page.locator('#playerContainer iframe').count()) === 0;
        result.passed = result.cleanExit && errors.length === 0;
      } catch (error) {
        result.passed = false;
        result.failure = error.message;
        await page.screenshot({
          path: artifactPath('test-results/sample-games/') + fixture.system + '-failure.png',
          fullPage: true
        });
      }
      results.push(result);
      console.log(JSON.stringify(result));
      await context.close();
    }
  } finally {
    const reportPath = artifactPath('test-results-sample-games.json');
    if (process.env.WEBMU_SYSTEMS && fs.existsSync(reportPath)) {
      const previous = JSON.parse(fs.readFileSync(reportPath, 'utf8')).results;
      for (const result of previous) {
        if (!results.some((current) => current.system === result.system)) results.push(result);
      }
    }
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        { testedAt: new Date().toISOString(), browser: browser.version(), results },
        null,
        2
      ) + '\n'
    );
    await browser.close();
  }
  if (results.some((result) => !result.passed)) process.exitCode = 1;
})();
