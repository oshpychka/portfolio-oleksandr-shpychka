import { play } from './sound';
import type { StackPhysics } from './stack-physics';

export function initStack() {
  const area = document.querySelector<HTMLElement>('[data-physics-area]');
  const hint = document.querySelector<HTMLElement>('[data-physics-hint]');
  if (!area || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const words = [...area.querySelectorAll<HTMLElement>('[data-physics-body]')];
  let physics: StackPhysics | null = null;
  let loading: Promise<void> | null = null;
  let inView = false;
  let seen = false;
  let destroyed = false;

  const update = () => {
    if (!physics) return;
    if (inView && !document.hidden) physics.start();
    else physics.stop();
  };

  // Load matter-js and build the world well before the section is on screen,
  // so the moment it scrolls in the words just start falling, without a hitch.
  const load = () =>
    (loading ??= import('./stack-physics').then(({ createStackPhysics }) => {
      if (destroyed) return;
      physics = createStackPhysics({ area, words, onCollide: (s) => play('collide', s * 0.7) });
      if (hint) hint.hidden = false;
      update();
    }));

  const near = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) load();
    },
    { rootMargin: '100% 0px' },
  );
  const view = new IntersectionObserver(
    ([entry]) => {
      // First drop waits until a good part of the area is visible; after that it runs whenever on screen.
      if (entry.intersectionRatio >= 0.3) seen = true;
      inView = entry.isIntersecting && seen;
      update();
    },
    { threshold: [0, 0.3] },
  );
  near.observe(area);
  view.observe(area);
  document.addEventListener('visibilitychange', update);

  return () => {
    destroyed = true;
    near.disconnect();
    view.disconnect();
    document.removeEventListener('visibilitychange', update);
    physics?.destroy();
    physics = null;
    if (hint) hint.hidden = true;
  };
}
