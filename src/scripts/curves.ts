import { gsap, MOTION } from './gsap';

export function initCurves() {
  const root = document.documentElement;
  const mm = gsap.matchMedia();

  mm.add(MOTION, () => {
    const curves = [...document.querySelectorAll<HTMLElement>('[data-curve]')];
    if (!curves.length) return;
    root.classList.add('has-curves');

    curves.forEach((curve) => {
      const section = curve.parentElement;
      if (!section) return;
      gsap.fromTo(
        curve,
        { scaleY: 1 },
        {
          scaleY: 0,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'bottom bottom', end: 'bottom 25%', scrub: 0.6 },
        },
      );
    });

    return () => root.classList.remove('has-curves');
  });

  return () => mm.revert();
}
