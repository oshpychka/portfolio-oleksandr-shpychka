import { gsap } from './gsap';
import { mount, unmount } from './app';

let wired = false;

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const panel = () => document.querySelector<HTMLElement>('[data-curtain-panel]');
const label = () => document.querySelector<HTMLElement>('[data-curtain-label]');

function cover(path: string) {
  const el = panel();
  if (!el || reduce()) return Promise.resolve();
  const text = label();
  if (text) text.textContent = `// Loading ${path === '/' ? 'home' : path.replace(/^\//, '')}`;
  return new Promise<void>((resolve) => {
    gsap.killTweensOf(el);
    gsap
      .timeline({ onComplete: resolve })
      .set(el, { visibility: 'visible', yPercent: 100, '--top': '100%', '--bottom': '0%' })
      .to(el, { yPercent: 0, duration: 0.65, ease: 'expo.inOut' })
      .to(el, { '--top': '0%', duration: 0.45, ease: 'power2.out' }, 0.25);
  });
}

function uncover() {
  const el = panel();
  if (!el || reduce() || getComputedStyle(el).visibility === 'hidden') return;
  gsap.killTweensOf(el);
  gsap
    .timeline({ onComplete: () => gsap.set(el, { visibility: 'hidden' }) })
    .to(el, { yPercent: -100, duration: 0.8, ease: 'expo.inOut', delay: 0.05 })
    .fromTo(el, { '--bottom': '0%' }, { '--bottom': '100%', duration: 0.5, ease: 'power2.out' }, 0.05);
}

export function initTransitions() {
  if (wired) return;
  wired = true;

  document.addEventListener('astro:before-preparation', (event) => {
    const e = event as Event & { to: URL; loader: () => Promise<void> };
    const original = e.loader;
    e.loader = async () => {
      await Promise.all([cover(e.to.pathname), original()]);
    };
  });

  document.addEventListener('astro:before-swap', (event) => {
    const e = event as Event & { newDocument: Document };
    unmount();
    const root = e.newDocument.documentElement;
    root.classList.remove('no-js');
    root.classList.add('js');
    if (document.documentElement.classList.contains('sound-on')) root.classList.add('sound-on');
  });

  document.addEventListener('astro:page-load', () => {
    mount();
    uncover();
  });
}
