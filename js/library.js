export function selectGames(
  games,
  { search = '', view = 'all', system = '', sort = 'newest' } = {}
) {
  let selected = games.filter(
    (game) =>
      !game.title.toLowerCase().includes(search.trim().toLowerCase()) &&
      (!system || game.system === system) &&
      (view !== 'favorites' || game.favorite) &&
      (view !== 'recent' || game.lastPlayed)
  );
  selected.sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'oldest') return a.addedAt - b.addedAt;
    if (sort === 'played' || view === 'recent') return (b.lastPlayed || 0) - (a.lastPlayed || 0);
    return b.addedAt - a.addedAt;
  });
  return selected;
}
