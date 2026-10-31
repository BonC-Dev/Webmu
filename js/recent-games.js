import { getSystem } from './systems.js';

export function createRecentGames(onPlay, coverFor) {
  const list = document.getElementById('recentGames');
  const previous = document.getElementById('previousRecent');
  const next = document.getElementById('nextRecent');
  function controls() {
    previous.disabled = list.scrollLeft < 3;
    next.disabled = list.scrollWidth <= list.clientWidth + list.scrollLeft + 3;
  }
  function move(direction) {
    list.scrollBy({
      left: direction * 250,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  }
  previous.onclick = () => move(-1);
  next.onclick = () => move(1);
  list.addEventListener('scroll', controls, { passive: true });
  window.addEventListener('resize', controls);
  return {
    update(games) {
      const recent = games
        .filter((game) => game.lastPlayed)
        .sort((a, b) => b.lastPlayed - a.lastPlayed)
        .slice(0, 12);
      list.replaceChildren();
      document.getElementById('recentEmpty').hidden = recent.length > 0;
      for (const game of recent) {
        const card = document.createElement('article');
        card.className = 'recent-game';
        const image = document.createElement('img');
        image.src = coverFor(game);
        image.alt = '';
        const text = document.createElement('div');
        const title = document.createElement('h3');
        title.textContent = game.title;
        const platform = document.createElement('span');
        platform.textContent = getSystem(game.system).displayName;
        const play = document.createElement('button');
        play.className = 'quiet-button';
        play.textContent = 'Play ↗';
        play.setAttribute('aria-label', 'Play ' + game.title);
        play.onclick = () => onPlay(game);
        text.append(title, platform);
        card.append(image, text, play);
        list.append(card);
      }
      requestAnimationFrame(controls);
    }
  };
}
