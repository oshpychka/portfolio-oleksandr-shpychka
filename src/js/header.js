document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('#header');
    const hamburger = document.querySelector('#hamburger');
    const mobileMenu = document.querySelector('#mobile-menu');
    const siteBlur = document.querySelector('#site-blur');
    const mobileLinks = mobileMenu?.querySelectorAll('a[href^="#"]') || [];

    let lastScroll = window.scrollY;
    let scrollDownDistance = 0;
    let menuOpen = false;

    const openMenu = () => {
        menuOpen = true;
        hamburger.classList.add('active');
        mobileMenu.classList.add('open');
        siteBlur.classList.add('active');
        header.classList.remove('blur');
        document.body.classList.add('no-scroll');
    };

    const closeMenu = () => {
        menuOpen = false;
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        siteBlur.classList.remove('active');
        document.body.classList.remove('no-scroll');

        if (window.scrollY > 0) {
            header.classList.add('blur');
        }
    };

    hamburger?.addEventListener('click', () => {
        menuOpen ? closeMenu() : openMenu();
    });

    siteBlur?.addEventListener('click', closeMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('scroll', () => {
        if (menuOpen) return;

        const currentScroll = window.scrollY;

        if (currentScroll > 0) {
            header.classList.add('blur');
        } else {
            header.classList.remove('blur');
        }

        if (currentScroll > lastScroll) {
            scrollDownDistance += currentScroll - lastScroll;
            if (scrollDownDistance > 90) {
                header.classList.remove('sticky');
            }
        } else {
            header.classList.add('sticky');
            scrollDownDistance = 0;
        }

        lastScroll = currentScroll;
    });
});