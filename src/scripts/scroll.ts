import Lenis from 'lenis';
import { gsap, ScrollTrigger, MOTION } from './gsap';
import { hasEntered } from './boot';

let lenis: Lenis | null = null;

export const getLenis = () => lenis;

function scrollToHash(hash: string, immediate = false) {
  const target = hash === '#top' ? 0 : document.getElementById(decodeURIComponent(hash.slice(1)));
  if (target === null) return false;
  if (lenis) {
    lenis.scrollTo(target as HTMLElement | number, { immediate, duration: immediate ? 0 : 1.4 });
  } else if (typeof target === 'number') {
    window.scrollTo({ top: 0 });
  } else {
    target.scrollIntoView();
  }
  if (target instanceof HTMLElement) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
  return true;
}

export function initScroll() {
  const cleanups: Array<() => void> = [];

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link || link.target || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (url.pathname !== location.pathname || url.origin !== location.origin || !url.hash) return;
    if (scrollToHash(url.hash)) {
      e.preventDefault();
      history.pushState(null, '', url.hash === '#top' ? url.pathname : url.hash);
    }
  };
  window.addEventListener('click', onClick, true);
  cleanups.push(() => window.removeEventListener('click', onClick, true));

  const mm = gsap.matchMedia();
  mm.add(MOTION, () => {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false, anchors: false });
    const tick = (time: number) => lenis?.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onMenu = (e: Event) => {
      if ((e as CustomEvent<{ open: boolean }>).detail.open) lenis?.stop();
      else lenis?.start();
    };
    document.addEventListener('menu:change', onMenu);
    const onEnter = () => lenis?.start();
    if (!hasEntered()) lenis.stop();
    document.addEventListener('os:enter', onEnter);

    return () => {
      document.removeEventListener('os:enter', onEnter);
      document.removeEventListener('menu:change', onMenu);
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  });
  cleanups.push(() => mm.revert());

  if (location.hash) requestAnimationFrame(() => scrollToHash(location.hash, true));

  const refresh = () => ScrollTrigger.refresh();
  document.fonts?.ready.then(refresh);
  window.addEventListener('load', refresh, { once: true });
  cleanups.push(() => window.removeEventListener('load', refresh));

  return () => cleanups.forEach((fn) => fn());
}
