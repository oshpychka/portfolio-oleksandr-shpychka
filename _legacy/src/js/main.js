import './header.js';
import './lenis.js';
import './hero.js';
import { initAnimations } from './animations.js';

const preloader = document.getElementById('preloader');

document.documentElement.classList.add('is-loading');

window.addEventListener('load', () => {
    setTimeout(() => {
        preloader.classList.add('hide');
        document.documentElement.classList.remove('is-loading');

        initAnimations();

    }, 2000);
});