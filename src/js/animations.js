export function initAnimations() {

    // Block Animations

    const elements = document.querySelectorAll('.animation');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const el = entry.target;

                if (el.dataset.delay) {
                    el.style.setProperty('--delay', `${el.dataset.delay}s`);
                }

                if (el.dataset.duration) {
                    el.style.setProperty('--duration', `${el.dataset.duration}s`);
                }

                el.classList.add('show');
                observer.unobserve(el);
            });
        },
        {
            threshold: 0.2
        }
    );

    elements.forEach(el => observer.observe(el));

    // Title Animation

    const titles = [...document.querySelectorAll('.title-animation')];

    titles.forEach(el => {
        const words = el.textContent.trim().split(/\s+/);
        el.textContent = '';

        words.forEach((word, i) => {
            const span = document.createElement('span');
            span.style.setProperty('--i', i);
            span.textContent = word;
            el.appendChild(span);

            if (i < words.length - 1) {
                el.append(' ');
            }
        });
    });

    const titleObserver = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            e.target.classList.add('show');
            titleObserver.unobserve(e.target);
        });
    }, { threshold: 0.6 });

    titles.forEach(el => titleObserver.observe(el));

    // Cursor Glow

    const glow = document.querySelector('.cursor-glow');

    let isShown = false;

    document.addEventListener('mousemove', (e) => {
        if (!isShown) {
            glow.classList.add('is-visible');
            isShown = true;
        }

        glow.style.left = e.clientX + 'px';
        glow.style.top  = e.clientY + 'px';
    });

    document.addEventListener('mouseleave', () => {
        glow.classList.remove('is-visible');
        isShown = false;
    });
}