import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

export { gsap, ScrollTrigger, SplitText };

export const MOTION = '(prefers-reduced-motion: no-preference)';
export const REDUCED = '(prefers-reduced-motion: reduce)';
export const DESKTOP = '(min-width: 861px)';
