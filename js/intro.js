function showIntro() {
  const curtain = document.getElementById('startupIntro');
  const page = new URLSearchParams(location.search);
  if (
    page.has('console') ||
    page.has('library') ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    curtain.remove();
    return;
  }

  const background = document.createElement('div');
  background.className = 'intro-blackout';
  const caption = document.createElement('p');
  caption.className = 'intro-caption';
  caption.textContent = 'Not loading..';
  curtain.append(background, caption);

  const logos = [
    'nes.svg',
    'sms.png',
    'genesis.svg',
    'gb.svg',
    'gg.svg',
    'snes.svg',
    'flash.svg',
    'gbc.svg',
    'gba.svg'
  ];
  for (let i = 0; i < logos.length; i++) {
    const logo = document.createElement('img');
    logo.src = 'assets/logos/' + logos[i];
    logo.alt = '';
    if (i === logos.length - 1) {
      logo.className = 'intro-last-logo';
    } else {
      logo.className = 'intro-flying-logo';
      logo.style.animationDelay = i * 0.1 + 's';
      logo.style.top = 35 + (i % 3) * 12 + '%';
    }
    curtain.append(logo);
  }

  curtain.addEventListener('animationend', (event) => {
    if (event.animationName === 'finish-intro') curtain.remove();
  });
  setTimeout(() => curtain.remove(), 2100);
}

showIntro();
