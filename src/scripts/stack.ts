import { play } from './sound';
import type { StackPhysics } from './stack-physics';

export function initStack() {
  const area = document.querySelector<HTMLElement>('[data-physics-area]');
  const hint = document.querySelector<HTMLElement>('[data-physics-hint]');
  if (!area || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const words = [...area.querySelectorAll<HTMLElement>('[data-physics-body]')];
  let physics: StackPhysics | null = null;
  let loading = false;
  let visible = false;
  let destroyed = false;

  const update = () => {
    if (!physics) return;
    if (visible && !document.hidden) physics.start();
    else physics.stop();
  };

  const load = async () => {
    if (loading || physics) return;
    loading = true;
    const { createStackPhysics } = await import('./stack-physics');
    if (destroyed) return;
    physics = createStackPhysics({ area, words, onCollide: (s) => play('collide', s * 0.7) });
    if (hint) hint.hidden = false;
    update();
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible && entry.intersectionRatio >= 0.2) load();
      update();
    },
    { threshold: [0, 0.2, 0.5] },
  );
  io.observe(area);
  document.addEventListener('visibilitychange', update);

  return () => {
    destroyed = true;
    io.disconnect();
    document.removeEventListener('visibilitychange', update);
    physics?.destroy();
    physics = null;
    if (hint) hint.hidden = true;
  };
}
