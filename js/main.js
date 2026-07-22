/**
 * DMC Medical Supplies - Main JavaScript Module
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Hide Preloader when page is ready
    const preloader = document.getElementById('loading');
    if (preloader) {
        setTimeout(() => {
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
        }, 300);
    }

    // 2. Active Link Handler
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'index.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 3. Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 30) {
                navbar.classList.add('shadow');
                navbar.style.padding = '0.4rem 1rem';
            } else {
                navbar.classList.remove('shadow');
                navbar.style.padding = '0.75rem 1rem';
            }
        });
    }

    // 4. Intersection Observer for Scroll Animations
    const animatedElements = document.querySelectorAll('.fade-in-section, .zoom-in, .slide-in-right, .slide-in-left');
    if (animatedElements.length > 0 && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        animatedElements.forEach(el => observer.observe(el));
    }
});
