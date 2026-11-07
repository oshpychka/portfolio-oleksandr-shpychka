import { gsap, MOTION } from './gsap';

export function initParallax() {
  const mm = gsap.matchMedia();

  mm.add(MOTION, () => {
    document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((frame) => {
      const media = frame.querySelector<HTMLElement>('img, picture, video');
      if (!media) return;
      const amount = Number(frame.dataset.parallax) || 10;
      gsap.fromTo(
        media,
        { yPercent: -amount, scale: 1 + (amount * 2.4) / 100 },
        {
          yPercent: amount,
          ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });
  });

  return () => mm.revert();
}
