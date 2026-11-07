import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

gsap.timeline({
    scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: `+=${window.innerHeight}px`,
        pin: true,
        pinSpacing: false,
        scrub: true
    }
});