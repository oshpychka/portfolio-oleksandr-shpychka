import Lenis from 'lenis'

const lenis = new Lenis({
    duration: 1.2,
    easing: t => 1 - Math.pow(1 - t, 4),
    smooth: true,
    smoothTouch: false,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.2,
    normalizeWheel: true,
})

function raf(time) {
    lenis.raf(time)
    requestAnimationFrame(raf)
}

requestAnimationFrame(raf)

document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault()
        const target = document.querySelector(a.getAttribute('href'))
        if (target) {
            lenis.scrollTo(target, {
                duration: 1.4,
                easing: t => 1 - Math.pow(1 - t, 4),
            })
        }
    })
})
