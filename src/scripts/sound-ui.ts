import { play, toggleSound, isSoundOn, onSoundChange, initSoundGlobal } from './sound';

const HOVER = 'a[href], button, [data-sound-hover]';

export function initSoundUI() {
  initSoundGlobal();
  const toggles = [...document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]')];

  const sync = (on: boolean) =>
    toggles.forEach((t) => {
      t.setAttribute('aria-pressed', String(on));
      const state = t.querySelector('[data-sound-state]');
      if (state) state.textContent = on ? 'On' : 'Off';
    });

  toggles.forEach((t) => {
    t.hidden = false;
    t.addEventListener('click', toggleSound);
  });
  sync(isSoundOn());
  const off = onSoundChange(sync);

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const onOver = (e: PointerEvent) => {
    if (!fine.matches) return;
    const el = (e.target as Element).closest(HOVER);
    if (!el) return;
    const from = e.relatedTarget as Node | null;
    if (from && el.contains(from)) return;
    play('tick');
  };
  const onDown = (e: PointerEvent) => {
    if ((e.target as Element).closest(HOVER)) play('click');
  };
  const onNode = () => play('node');
  const onCopy = () => play('copy');

  document.addEventListener('pointerover', onOver);
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('line:node', onNode);
  document.addEventListener('email:copied', onCopy);

  return () => {
    toggles.forEach((t) => t.removeEventListener('click', toggleSound));
    off();
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('line:node', onNode);
    document.removeEventListener('email:copied', onCopy);
  };
}
