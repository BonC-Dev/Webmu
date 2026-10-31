module.exports = async function emptyLibrary(page) {
  await page.evaluate(async () => {
    const { ready, refresh } = await import('./js/app.js');
    await ready;
    const { read, removeGame } = await import('./js/database.js');
    for (const game of await read('Games')) await removeGame(game);
    await refresh();
  });
};
