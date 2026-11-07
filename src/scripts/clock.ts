export function initClocks(timeZone: string) {
  const nodes = [...document.querySelectorAll<HTMLElement>('[data-clock]')];
  if (!nodes.length) return () => {};

  const format = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  let timer = 0;

  const render = () => {
    const now = format.format(new Date());
    nodes.forEach((node) => {
      node.textContent = now;
      node.closest('time')?.setAttribute('datetime', new Date().toISOString());
    });
  };

  const schedule = () => {
    window.clearTimeout(timer);
    if (document.hidden) return;
    render();
    timer = window.setTimeout(schedule, 60000 - (Date.now() % 60000) + 50);
  };

  const onVisibility = () => schedule();

  nodes.forEach((node) => node.closest('[data-clock-wrap]')?.removeAttribute('hidden'));
  schedule();
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
