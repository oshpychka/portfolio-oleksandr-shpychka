export function initMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return () => {};

  const main = document.getElementById('main');
  const header = document.querySelector<HTMLElement>('.site-header');
  let lastFocus: HTMLElement | null = null;

  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.documentElement.classList.toggle('menu-open', open);
    main?.toggleAttribute('inert', open);
    header?.toggleAttribute('inert', open);
    if (open) {
      lastFocus = document.activeElement as HTMLElement | null;
      menu.querySelector<HTMLElement>('a')?.focus();
    } else {
      lastFocus?.focus?.();
    }
  };

  const onToggle = () => setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !menu.hidden) {
      lastFocus = toggle;
      setOpen(false);
    }
  };
  const onLink = (e: Event) => {
    if ((e.target as HTMLElement).closest('a')) {
      lastFocus = null;
      setOpen(false);
    }
  };
  const onResize = () => {
    if (!menu.hidden && getComputedStyle(toggle).display === 'none') setOpen(false);
  };

  toggle.addEventListener('click', onToggle);
  menu.addEventListener('click', onLink);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  return () => {
    toggle.removeEventListener('click', onToggle);
    menu.removeEventListener('click', onLink);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    setOpen(false);
  };
}
