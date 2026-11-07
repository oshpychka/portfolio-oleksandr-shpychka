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
import { initHero } from './hero';
import { initPreview } from './preview';
import { initStack } from './stack';
import { initCursor } from './cursor';
import { initBlueprint } from './blueprint';

type Cleanup = () => void;

let cleanups: Cleanup[] = [];
let generation = 0;

const idle = (fn: () => void) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 700 }) : window.setTimeout(fn, 120);

export function mount() {
  unmount();
  const current = generation;
  cleanups = [initBoot(), initSoundUI(), initMenu(), initScroll(), initHeader(), initHero()];
  idle(() => {
    if (current !== generation) return;
    cleanups.push(
      initCurves(),
      initParallax(),
      initCopy(),
      initClocks(SITE.timeZone),
      initPreview(),
      initStack(),
      initCursor(),
      initBlueprint(),
    );
  });
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
