// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Mobile Navigation Toggle
const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
const primaryNav = document.querySelector('.primary-navigation');

mobileNavToggle.addEventListener('click', () => {
    const isVisible = primaryNav.getAttribute('data-visible') === 'true';
    if (isVisible) {
        primaryNav.setAttribute('data-visible', false);
        mobileNavToggle.setAttribute('aria-expanded', false);
    } else {
        primaryNav.setAttribute('data-visible', true);
        mobileNavToggle.setAttribute('aria-expanded', true);
    }
});
