import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

// Hero Pin

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

// Hero Buttons Animation

const button = document.querySelector('.hero__second-btn');

let isManualHover = false;

button.addEventListener('mouseenter', () => {
    isManualHover = true;
});

button.addEventListener('mouseleave', () => {
    isManualHover = false;
});

setInterval(() => {
    if (isManualHover) return;

    button.classList.add('is-hovered');

    setTimeout(() => {
        button.classList.remove('is-hovered');
    }, 1000);
}, 3000);
