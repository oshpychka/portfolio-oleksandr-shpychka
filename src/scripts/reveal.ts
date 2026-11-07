import { gsap, SplitText, MOTION } from './gsap';

const CHARS = '01<>/\\[]{}#+=*_';

export function initReveal() {
  const root = document.documentElement;
  const mm = gsap.matchMedia();

  mm.add(MOTION, () => {
    const splits: SplitText[] = [];

    document.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((el) => {
      splits.push(
        SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'reveal-line',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: 1.1,
              ease: 'expo.out',
              stagger: 0.09,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            }),
        }),
      );
    });

    document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
      const text = el.textContent ?? '';
      if (!text.trim()) return;
      gsap.to(el, {
        duration: Math.min(1.4, 0.4 + text.length * 0.035),
        ease: 'none',
        scrambleText: { text, chars: CHARS, speed: 0.5, revealDelay: 0.15 },
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      });
    });

    root.classList.remove('reveal-pending');

    return () => splits.forEach((s) => s.revert());
  });

  root.classList.remove('reveal-pending');
  return () => mm.revert();
}
