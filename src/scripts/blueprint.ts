import { play } from './sound';

const MEASURE = 'main section, main article > header, main h1, main h2, main img, main .btn, main .prow, main .exp__item, main .card, main figure, footer';
const MAX_LABELS = 90;

let on = false;

export function initBlueprint() {
  const root = document.documentElement;
  const toggles = [...document.querySelectorAll<HTMLButtonElement>('[data-blueprint-toggle]')];
  toggles.forEach((t) => (t.hidden = false));

  let layer: HTMLElement | null = null;
  let toast: HTMLElement | null = null;
  let timer = 0;

  const docRect = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  };

  const draw = () => {
    if (!layer) return;
    const frag = document.createDocumentFragment();
    const container = document.querySelector('main .container');
    if (container) {
      const c = docRect(container);
      const style = getComputedStyle(container);
      const padL = parseFloat(style.paddingLeft);
      const cols = document.createElement('div');
      cols.className = 'bp-cols';
      cols.style.cssText = `left:${c.x + padL}px;width:${c.w - padL * 2}px;height:${document.documentElement.scrollHeight}px`;
      for (let i = 0; i < 12; i++) cols.appendChild(document.createElement('i'));
      frag.appendChild(cols);
    }

    document.querySelectorAll<HTMLElement>('main section, main article > header').forEach((section) => {
      const r = docRect(section);
      const st = getComputedStyle(section);
      const pt = parseFloat(st.paddingTop);
      const pb = parseFloat(st.paddingBottom);
      [
        [r.y, pt],
        [r.y + r.h - pb, pb],
      ].forEach(([y, h]) => {
        if (h < 8) return;
        const pad = document.createElement('div');
        pad.className = 'bp-pad';
        pad.style.cssText = `top:${y}px;height:${h}px;width:${r.w}px;left:${r.x}px`;
        pad.dataset.size = `padding ${Math.round(h)}`;
        frag.appendChild(pad);
      });
    });

    [...document.querySelectorAll<HTMLElement>(MEASURE)].slice(0, MAX_LABELS).forEach((el) => {
      const r = docRect(el);
      if (r.w < 4 || r.h < 4) return;
      const tag = document.createElement('span');
      tag.className = 'bp-tag mono';
      tag.style.cssText = `top:${r.y}px;left:${r.x}px`;
      tag.textContent = `${Math.round(r.w)} × ${Math.round(r.h)}`;
      frag.appendChild(tag);
    });

    layer.replaceChildren(frag);
    layer.style.height = `${document.documentElement.scrollHeight}px`;
  };

  const redraw = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(draw, 150);
  };
  const ro = new ResizeObserver(() => on && redraw());

  const set = (value: boolean, withSound = true) => {
    on = value;
    root.classList.toggle('blueprint', on);
    toggles.forEach((t) => t.setAttribute('aria-pressed', String(on)));
    if (withSound) play('click');
    if (on) {
      layer = document.createElement('div');
      layer.className = 'bp-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
      toast = document.createElement('p');
      toast.className = 'bp-toast mono mono-s';
      toast.setAttribute('role', 'status');
      toast.textContent = 'Blueprint mode: on · press B to exit';
      document.body.appendChild(toast);
      draw();
      ro.observe(document.body);
    } else {
      ro.disconnect();
      layer?.remove();
      toast?.remove();
      layer = null;
      toast = null;
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key.toLowerCase() !== 'b' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
    set(!on);
  };
  const onToggle = () => set(!on);

  document.addEventListener('keydown', onKey);
  toggles.forEach((t) => t.addEventListener('click', onToggle));
  if (on) set(true, false);

  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    toggles.forEach((t) => t.removeEventListener('click', onToggle));
    const keep = on;
    set(false, false);
    on = keep;
  };
}
