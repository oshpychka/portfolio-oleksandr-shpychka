export function initCopy() {
  const link = document.querySelector<HTMLAnchorElement>('[data-copy]');
  const hint = document.querySelector<HTMLElement>('[data-copy-hint]');
  const label = document.querySelector<HTMLElement>('[data-copy-label]');
  const status = document.querySelector<HTMLElement>('[data-copy-status]');
  if (!link || !hint || !label || !navigator.clipboard) return () => {};

  hint.hidden = false;
  let timer = 0;

  const onClick = async (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(link.dataset.copy ?? '');
    } catch {
      window.location.href = link.href;
      return;
    }
    label.textContent = 'Copied';
    document.dispatchEvent(new CustomEvent('email:copied'));
    hint.setAttribute('data-copied', '');
    if (status) status.textContent = 'Email address copied to clipboard';
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      label.textContent = 'Click to copy';
      hint.removeAttribute('data-copied');
      if (status) status.textContent = '';
    }, 2200);
  };

  link.addEventListener('click', onClick);
  return () => {
    window.clearTimeout(timer);
    link.removeEventListener('click', onClick);
  };
}
