import { chronologicalSystems } from './systems.js';

export function createSystemBrowser(onSelect) {
  const carousel = document.getElementById('systemCarousel');
  const timeline = document.getElementById('systemTimeline');
  const pause = document.getElementById('pauseSystems');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [];
  let current = chronologicalSystems.findIndex((system) => system.id === 'gb');
  let paused = reducedMotion.matches;
  const labels = {
    nes: ['Made by Nintendo as a home console.', '#d98981'],
    sms: ['Made by Sega as a home console.', '#bd9394'],
    genesis: ['Made by Sega as a home console.', '#85a9d2'],
    gb: ['Made by Nintendo as a handheld device.', '#b3a4d6'],
    gg: ['Made by Sega as a handheld device.', '#7eb6b1'],
    snes: ['Made by Nintendo as a home console.', '#aaa0cf'],
    flash: ['Flash content', '#dc9d70'],
    gbc: ['Made by Nintendo as a handheld device.', '#c0ba79'],
    gba: ['Made by Nintendo as a handheld device.', '#929ed7']
  };
  for (const [index, system] of chronologicalSystems.entries()) {
    const item = document.createElement('li');
    item.dataset.release = system.releaseYear;
    const button = document.createElement('button');
    button.className = 'system-card';
    button.dataset.system = system.id;
    button.setAttribute('aria-label', system.displayName + ', ' + system.releaseYear);
    const image = document.createElement('img');
    image.src = 'assets/logos/' + system.id + (system.id === 'sms' ? '.png' : '.svg');
    image.alt = '';
    image.className = 'system-logo';
    const year = document.createElement('span');
    year.className = 'release-year';
    year.textContent = system.releaseYear;
    const detail = document.createElement('span');
    detail.className = 'system-detail';
    detail.textContent = labels[system.id][0];
    button.style.setProperty('--system-ink', labels[system.id][1]);
    const name = document.createElement('strong');
    name.textContent = system.displayName;
    button.append(year, image, name, detail);
    button.onclick = () => onSelect(system.id);
    item.append(button);
    carousel.append(item);
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', 'Show ' + system.displayName + ', ' + system.releaseYear);
    dot.title = system.displayName + ' · ' + system.releaseYear;
    dot.onclick = () => focusSystem(index);
    timeline.append(dot);
    cards.push({ item, button, dot, system });
  }
  // One position drives the whole strip. Cards wrap only outside the viewport.
  let position = current;
  let destination = null;
  let lastTime = 0;
  let lastArrowClick = -Infinity;
  let frame;
  function draw() {
    current = ((Math.round(position) % cards.length) + cards.length) % cards.length;
    const width = carousel.clientWidth;
    const cardWidth = width < 500 ? 218 : width < 900 ? 295 : 340;
    const spacing = cardWidth + (width < 500 ? 18 : 26);
    for (const [index, card] of cards.entries()) {
      let distance = (index - position) % cards.length;
      if (distance > cards.length / 2) distance -= cards.length;
      if (distance < -cards.length / 2) distance += cards.length;
      const scale = 1 - Math.min(Math.abs(distance), 1) * 0.14;
      const visible = Math.abs(distance * spacing) < width / 2 + cardWidth / 2;
      card.item.style.transform =
        'translateX(calc(-50% + ' + distance * spacing + 'px)) scale(' + scale + ')';
      card.item.style.opacity = String(1 - Math.min(Math.abs(distance), 1) * 0.32);
      card.item.style.visibility = visible ? 'visible' : 'hidden';
      card.item.dataset.position = !visible
        ? 'hidden'
        : index === current
          ? 'current'
          : distance < 0
            ? 'previous'
            : 'next';
      card.button.tabIndex = visible ? 0 : -1;
      card.item.setAttribute('aria-hidden', String(!visible));
      card.button.setAttribute('aria-pressed', String(index === current));
      card.dot.setAttribute('aria-pressed', String(index === current));
    }
    document.getElementById('carouselPosition').textContent =
      String(current + 1) + ' of ' + cards.length;
    pause.textContent = paused ? 'Play motion' : 'Pause motion';
    pause.setAttribute('aria-pressed', String(paused));
  }
  function tick(time) {
    const seconds = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    if (destination !== null) {
      // Retarget from the current position, including during repeated clicks.
      const difference = destination - position;
      if (reducedMotion.matches || Math.abs(difference) < 0.001) {
        position = destination;
        destination = null;
      } else {
        const step = Math.min(Math.abs(difference) * (1 - Math.exp(-7 * seconds)), seconds * 3.5);
        position += Math.sign(difference) * step;
      }
    } else if (
      !paused &&
      !carousel.closest('section').hidden &&
      !document.hidden &&
      !carousel.parentElement.matches(':focus-within') &&
      !document.querySelector('dialog[open]') &&
      document.getElementById('playerScreen').hidden
    ) {
      position += seconds / 14;
    }
    draw();
    frame = requestAnimationFrame(tick);
  }
  function focusSystem(index) {
    const desired = ((index % cards.length) + cards.length) % cards.length;
    let difference = desired - (((position % cards.length) + cards.length) % cards.length);
    if (difference > cards.length / 2) difference -= cards.length;
    if (difference < -cards.length / 2) difference += cards.length;
    destination = position + difference;
  }
  function move(direction) {
    const now = performance.now();
    if (now - lastArrowClick < 400) return;
    lastArrowClick = now;
    destination = Math.round(position) + direction;
  }
  document.getElementById('previousSystem').onclick = () => move(-1);
  document.getElementById('nextSystem').onclick = () => move(1);
  document.getElementById('openFocusedSystem').onclick = () =>
    onSelect(
      cards[((Math.round(destination ?? position) % cards.length) + cards.length) % cards.length]
        .system.id
    );
  document.getElementById('clearSystem').onclick = () => onSelect('');
  pause.onclick = () => {
    paused = !paused;
    draw();
  };
  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) paused = true;
    draw();
  });
  window.addEventListener('pagehide', () => cancelAnimationFrame(frame));
  window.addEventListener('pageshow', () => {
    cancelAnimationFrame(frame);
    lastTime = 0;
    frame = requestAnimationFrame(tick);
  });
  draw();
  frame = requestAnimationFrame(tick);
  return {
    update(selected) {
      if (selected) {
        const index = cards.findIndex((card) => card.system.id === selected);
        if (
          index >= 0 &&
          index !==
            ((Math.round(destination ?? position) % cards.length) + cards.length) % cards.length
        )
          focusSystem(index);
      }
      document.getElementById('clearSystem').hidden = !selected;
    }
  };
}
