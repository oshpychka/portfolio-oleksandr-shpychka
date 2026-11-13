import { registerBootTask, whenEntered } from './boot';
import { play } from './sound';
import type { HeroScene } from './scene/hero-scene';

const STATIC_CLASS = 'scene-static';

function weakDevice() {
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ?? false;
  return cores < 4 || memory < 4 || saveData;
}

export function initHero() {
  const container = document.querySelector<HTMLElement>('[data-hero-scene]');
  const area = document.querySelector<HTMLElement>('[data-scene-area]');
  if (!container || !area) return () => {};

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || weakDevice() || !('WebGLRenderingContext' in window)) {
    root.classList.add(STATIC_CLASS);
    return () => root.classList.remove(STATIC_CLASS);
  }

  let scene: HeroScene | null = null;
  let destroyed = false;
  let visible = true;
  let entered = false;
  let slow = false;

  const update = () => {
    if (!scene) return;
    const shouldRun = visible && entered && !document.hidden && !slow;
    if (shouldRun) scene.start();
    else scene.stop();
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  });
  io.observe(container);
  document.addEventListener('visibilitychange', update);

  const load = new Promise<void>((resolve) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(async () => {
        try {
          const { createHeroScene } = await import('./scene/hero-scene');
          if (destroyed) return resolve();
          const created = createHeroScene({
            container,
            area,
            interactive: true,
            onCollide: (s) => play('collide', s),
            onSlow: () => {
              slow = true;
              root.classList.add('scene-slow');
              scene?.stop();
              scene?.renderOnce(true);
            },
          });
          await created.ready;
          if (destroyed) {
            created.destroy();
            return resolve();
          }
          // Expose the scene only after shaders compile, so it never starts mid-compile.
          scene = created;
          scene.renderOnce();
          root.classList.add('scene-live');
          update();
        } catch {
          root.classList.add(STATIC_CLASS);
        }
        resolve();
      }),
    );
  });
  registerBootTask('scene', load, 3);

  whenEntered().then(() => {
    entered = true;
    update();
  });

  return () => {
    destroyed = true;
    io.disconnect();
    document.removeEventListener('visibilitychange', update);
    scene?.destroy();
    scene = null;
    root.classList.remove(STATIC_CLASS, 'scene-live', 'scene-slow');
  };
}
