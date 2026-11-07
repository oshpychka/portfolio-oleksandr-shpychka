import { SITE } from '../config/site';
import { initScroll } from './scroll';
import { initHeader } from './header';
import { initReveal } from './reveal';
import { initParallax } from './parallax';
import { initCurves } from './curves';
import { initLine } from './line';
import { initMenu } from './menu';
import { initCopy } from './copy';
import { initClocks } from './clock';
import { initBoot, whenEntered } from './boot';
import { initSoundUI } from './sound-ui';

type Cleanup = () => void;

let cleanups: Cleanup[] = [];
let generation = 0;

export function mount() {
  unmount();
  const current = generation;
  cleanups = [
    initBoot(),
    initSoundUI(),
    initMenu(),
    initCopy(),
    initClocks(SITE.timeZone),
    initScroll(),
    initHeader(),
    initCurves(),
    initParallax(),
  ];
  const fonts = document.fonts?.ready ?? Promise.resolve();
  Promise.all([fonts, whenEntered()]).then(() => {
    if (current === generation) cleanups.push(initReveal(), initLine());
  });
}

export function unmount() {
  generation += 1;
  cleanups.reverse().forEach((fn) => fn());
  cleanups = [];
}
