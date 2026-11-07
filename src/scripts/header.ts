import { ScrollTrigger } from './gsap';

export function initHeader() {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return () => {};

  const root = document.documentElement;
  const triggers: ScrollTrigger[] = [];
  let menuOpen = false;
  let hidden = false;

  const setHidden = (value: boolean) => {
    if (menuOpen || value === hidden) return;
    hidden = value;
    root.classList.toggle('header-hidden', value);
  };

  triggers.push(
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        root.classList.toggle('scrolled', y > 40);
        if (y < 120) setHidden(false);
        else if (self.direction === 1 && Math.abs(self.getVelocity()) > 20) setHidden(true);
        else if (self.direction === -1) setHidden(false);
      },
    }),
  );

  document.querySelectorAll<HTMLElement>('main section, main > article > header, main > article > section').forEach((section) => {
    const tone = section.classList.contains('theme-cream') ? 'cream' : 'dark';
    triggers.push(
      ScrollTrigger.create({
        trigger: section,
        start: 'top 44px',
        end: 'bottom 44px',
        onToggle: (self) => {
          if (self.isActive) header.dataset.tone = tone;
        },
      }),
    );
  });

  const onMenu = (e: Event) => {
    menuOpen = (e as CustomEvent<{ open: boolean }>).detail.open;
  };
  document.addEventListener('menu:change', onMenu);

  return () => {
    triggers.forEach((t) => t.kill());
    document.removeEventListener('menu:change', onMenu);
    root.classList.remove('header-hidden', 'scrolled');
    delete header.dataset.tone;
  };
}
