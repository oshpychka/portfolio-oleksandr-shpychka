import { gsap } from './gsap';
import { enableSound, disableSound, tryAutoplay, play } from './sound';

type Task = { label: string; weight: number; done: boolean };

const MIN_FULL = 800;
const MIN_SHORT = 300;
const MAX_WAIT = 7000;
const STATUS: Record<string, string> = { type: 'Loading type', work: 'Loading work', scene: 'Loading scene', page: 'Loading page' };

let entered = false;
let resolveEnter: () => void = () => {};
const enterPromise = new Promise<void>((r) => (resolveEnter = r));
const pending: Array<{ label: string; promise: Promise<unknown>; weight: number }> = [];
let addTask: ((label: string, promise: Promise<unknown>, weight: number) => void) | null = null;

export const whenEntered = () => enterPromise;
export const hasEntered = () => entered;

export function registerBootTask(label: string, promise: Promise<unknown>, weight = 1) {
  if (entered) return;
  if (addTask) addTask(label, promise, weight);
  else pending.push({ label, promise, weight });
}

const settle = (p: Promise<unknown>) => p.then(() => undefined, () => undefined);

function preloadImage(img: HTMLImageElement) {
  return new Promise<void>((resolve) => {
    const pre = new Image();
    if (img.sizes) pre.sizes = img.sizes;
    if (img.srcset) pre.srcset = img.srcset;
    pre.src = img.currentSrc || img.src;
    const done = () => resolve();
    if (pre.decode) pre.decode().then(done, done);
    else {
      pre.onload = done;
      pre.onerror = done;
    }
  });
}

function finish() {
  entered = true;
  document.documentElement.classList.remove('is-booting');
  try {
    sessionStorage.setItem('os-booted', '1');
  } catch {}
  document.dispatchEvent(new CustomEvent('os:enter'));
  resolveEnter();
}

export function initBoot() {
  const boot = document.querySelector<HTMLElement>('[data-boot]');
  if (!boot) {
    if (!entered) finish();
    return () => {};
  }

  const short = boot.dataset.mode === 'short';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pct = boot.querySelector<HTMLElement>('[data-boot-pct]')!;
  const status = boot.querySelector<HTMLElement>('[data-boot-status]')!;
  const label = boot.querySelector<HTMLElement>('[data-boot-label]')!;
  const blocks = [...boot.querySelectorAll<HTMLElement>('.boot__blocks i')];
  const entry = boot.querySelector<HTMLElement>('[data-boot-entry]')!;
  const enterBtn = boot.querySelector<HTMLButtonElement>('[data-boot-enter]')!;
  const muteBtn = boot.querySelector<HTMLButtonElement>('[data-boot-mute]')!;
  const panel = boot.querySelector<HTMLElement>('.boot__panel')!;
  const veil = boot.querySelector<HTMLElement>('.boot__veil')!;
  const inertTargets = [document.getElementById('main'), document.querySelector('.site-header'), document.querySelector('.menu-toggle')].filter(Boolean) as HTMLElement[];
  inertTargets.forEach((el) => el.setAttribute('inert', ''));

  const tasks: Task[] = [];
  const shown = { value: 0 };
  const startedAt = performance.now();
  let ready = false;
  let leaving = false;
  let earlyIntent = false;

  const render = () => {
    const v = Math.round(shown.value);
    pct.textContent = `${v}%`;
    const on = Math.floor((v / 100) * blocks.length);
    blocks.forEach((b, i) => b.classList.toggle('is-on', i < on));
  };

  const progress = () => {
    const total = tasks.reduce((s, t) => s + t.weight, 0) || 1;
    return tasks.reduce((s, t) => s + (t.done ? t.weight : 0), 0) / total;
  };

  const updateStatus = () => {
    const next = tasks.find((t) => !t.done);
    status.textContent = next ? STATUS[next.label] ?? `Loading ${next.label}` : 'Starting system';
  };

  let tween: gsap.core.Tween | null = null;
  const advance = () => {
    const target = progress() * 100;
    tween?.kill();
    tween = gsap.to(shown, { value: target, duration: short ? 0.2 : 0.45, ease: 'power2.out', onUpdate: render, onComplete: maybeReady });
    updateStatus();
  };

  const track = (labelName: string, promise: Promise<unknown>, weight: number) => {
    const task: Task = { label: labelName, weight, done: false };
    tasks.push(task);
    settle(promise).then(() => {
      task.done = true;
      advance();
    });
  };

  const leave = (withSound: boolean) => {
    if (leaving) return;
    leaving = true;
    if (withSound) {
      enableSound();
      play('enter');
    }
    removeIntentListeners();
    inertTargets.forEach((el) => el.removeAttribute('inert'));
    boot.classList.add('is-leaving');
    finish();
    const remove = () => boot.remove();
    if (reduce) {
      gsap.to(boot, { autoAlpha: 0, duration: 0.25, onComplete: remove });
      return;
    }
    gsap
      .timeline({ onComplete: remove })
      .to(panel, { scale: 0.94, autoAlpha: 0, duration: 0.32, ease: 'power2.in' }, 0)
      .to(veil, { yPercent: -112, duration: 0.85, ease: 'expo.inOut' }, 0.08)
      .fromTo(veil, { '--curve': '0%' }, { '--curve': '100%', duration: 0.5, ease: 'power2.out' }, 0.08);
    window.setTimeout(remove, 2000);
  };

  const showEntry = () => {
    boot.classList.add('is-ready');
    label.textContent = 'System ready';
    status.textContent = 'Choose how to enter';
    entry.hidden = false;
    if (!reduce) gsap.from(entry, { opacity: 0, y: 12, duration: 0.5, ease: 'power3.out' });
    enterBtn.focus({ preventScroll: true });
  };

  function maybeReady() {
    if (ready || progress() < 1 || shown.value < 99.5) return;
    const elapsed = performance.now() - startedAt;
    const min = short ? MIN_SHORT : MIN_FULL;
    if (elapsed < min) {
      window.setTimeout(maybeReady, min - elapsed);
      return;
    }
    ready = true;
    if (earlyIntent || short) leave(false);
    else showEntry();
  }

  const onIntent = (e: Event) => {
    if (e.type === 'keydown') {
      const key = (e as KeyboardEvent).key;
      if (key !== 'Escape' && !['ArrowDown', 'PageDown', ' ', 'End'].includes(key)) return;
      if (key === ' ' && document.activeElement instanceof HTMLButtonElement && boot.contains(document.activeElement)) return;
    }
    if (e.type === 'pointerdown' && (e.target as Element).closest('[data-boot-enter], [data-boot-mute]')) return;
    if (ready) leave(false);
    else earlyIntent = true;
  };

  const intentEvents = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const;
  const removeIntentListeners = () => intentEvents.forEach((type) => window.removeEventListener(type, onIntent, true));
  intentEvents.forEach((type) => window.addEventListener(type, onIntent, { capture: true, passive: true }));

  enterBtn.addEventListener('click', () => leave(true));
  muteBtn.addEventListener('click', () => {
    disableSound();
    leave(false);
  });

  const idle = (fn: () => void) =>
    'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 1500 }) : window.setTimeout(fn, 200);
  const autoplay = () => idle(() => tryAutoplay());
  if (document.readyState === 'complete') autoplay();
  else window.addEventListener('load', autoplay, { once: true });
  addTask = track;
  track('type', document.fonts?.ready ?? Promise.resolve(), 2);
  const covers = [...document.querySelectorAll<HTMLImageElement>('.prow__media img, .card__media img, .case-cover img')].slice(0, 8);
  if (covers.length) track('work', Promise.all(covers.map(preloadImage)), 3);
  track('page', document.readyState === 'complete' ? Promise.resolve() : new Promise((r) => window.addEventListener('load', r, { once: true })), 1);
  pending.splice(0).forEach((p) => track(p.label, p.promise, p.weight));

  const safety = window.setTimeout(() => {
    tasks.forEach((t) => (t.done = true));
    advance();
  }, MAX_WAIT);

  advance();

  return () => {
    window.clearTimeout(safety);
    removeIntentListeners();
    tween?.kill();
    addTask = null;
  };
}
