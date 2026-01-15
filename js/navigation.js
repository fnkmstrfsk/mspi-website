/**
 * MSPI Navigation System
 * Handles mobile menu, anchor scrolling, and cross-page navigation
 */

(function() {
    'use strict';

    const NAV_HEIGHT = 72; // Fixed header height
    const SCROLL_OFFSET = 24; // Extra padding below header

    /**
     * Initialize navigation functionality
     */
    function init() {
        setupMobileNav();
        setupSmoothScrolling();
        setupNavScrollEffect();
        handleInitialHash();
    }

    /**
     * Mobile navigation toggle with proper close behavior
     */
    function setupMobileNav() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');

        if (!navToggle || !navMenu) return;

        // Toggle menu on hamburger click
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', navMenu.classList.contains('active'));
        });

        // Close menu when clicking a link inside nav
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                navToggle.focus();
            }
        });
    }

    /**
     * Setup smooth scrolling for anchor links with header offset
     */
    function setupSmoothScrolling() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href*="#"]');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // Handle same-page anchors (e.g., "#section")
            if (href.startsWith('#')) {
                e.preventDefault();
                scrollToAnchor(href.substring(1));
                return;
            }

            // Handle cross-page anchors (e.g., "/platform#revenue")
            if (href.includes('#')) {
                const [path, hash] = href.split('#');
                const currentPath = window.location.pathname;

                // Normalize paths for comparison
                const normalizedPath = path.replace(/\/$/, '') || '/';
                const normalizedCurrentPath = currentPath.replace(/\/$/, '') || '/';

                // If we're on the same page, scroll to anchor
                if (normalizedPath === normalizedCurrentPath ||
                    (normalizedPath === '' && normalizedCurrentPath === '/') ||
                    normalizedPath.endsWith(normalizedCurrentPath.split('/').pop())) {
                    e.preventDefault();
                    scrollToAnchor(hash);
                    return;
                }

                // Cross-page navigation: let browser handle navigation
                // The hash will be processed on page load
            }
        });
    }

    /**
     * Scroll to a specific anchor with offset for fixed header
     */
    function scrollToAnchor(anchorId) {
        if (!anchorId) return;

        const element = document.getElementById(anchorId);
        if (!element) {
            console.warn(`Anchor #${anchorId} not found`);
            return;
        }

        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = targetPosition - NAV_HEIGHT - SCROLL_OFFSET;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });

        // Update URL without triggering scroll
        history.pushState(null, '', '#' + anchorId);

        // Focus management for accessibility
        element.setAttribute('tabindex', '-1');
        element.focus({ preventScroll: true });
    }

    /**
     * Handle initial hash on page load (for cross-page navigation)
     */
    function handleInitialHash() {
        if (window.location.hash) {
            // Wait for page to fully render
            setTimeout(() => {
                const hash = window.location.hash.substring(1);
                scrollToAnchor(hash);
            }, 100);
        }
    }

    /**
     * Add scroll effect to navigation bar
     */
    function setupNavScrollEffect() {
        const nav = document.querySelector('.nav');
        if (!nav) return;

        let ticking = false;

        function updateNavState() {
            if (window.scrollY > 10) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNavState);
                ticking = true;
            }
        }, { passive: true });

        // Set initial state
        updateNavState();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.MSPINavigation = {
        scrollToAnchor,
        NAV_HEIGHT,
        SCROLL_OFFSET
    };

})();
