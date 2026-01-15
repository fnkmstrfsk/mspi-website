/**
 * MSPI Analytics & Logging System
 * Comprehensive tracking for all user interactions
 */

(function() {
    'use strict';

    // Configuration
    const ANALYTICS_CONFIG = {
        endpoint: '/api/analytics', // Replace with actual endpoint
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        scrollDepthMarks: [25, 50, 75, 90, 100],
        debounceDelay: 250,
        enableConsoleLogging: true, // Set to false in production
        version: '1.0.0'
    };

    // Session Management
    const SessionManager = {
        sessionId: null,
        userId: null,
        sessionStart: null,
        pageViewCount: 0,

        init() {
            this.userId = this.getOrCreateUserId();
            this.sessionId = this.getOrCreateSessionId();
            this.sessionStart = Date.now();
            this.pageViewCount = parseInt(sessionStorage.getItem('mspi_pageviews') || '0');
        },

        getOrCreateUserId() {
            let userId = localStorage.getItem('mspi_user_id');
            if (!userId) {
                userId = 'usr_' + this.generateId();
                localStorage.setItem('mspi_user_id', userId);
                localStorage.setItem('mspi_user_first_visit', new Date().toISOString());
            }
            return userId;
        },

        getOrCreateSessionId() {
            const lastActivity = sessionStorage.getItem('mspi_last_activity');
            let sessionId = sessionStorage.getItem('mspi_session_id');

            if (!sessionId || (lastActivity && Date.now() - parseInt(lastActivity) > ANALYTICS_CONFIG.sessionTimeout)) {
                sessionId = 'ses_' + this.generateId();
                sessionStorage.setItem('mspi_session_id', sessionId);
                sessionStorage.setItem('mspi_session_start', Date.now().toString());
                sessionStorage.setItem('mspi_pageviews', '0');
            }

            sessionStorage.setItem('mspi_last_activity', Date.now().toString());
            return sessionId;
        },

        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        },

        incrementPageViews() {
            this.pageViewCount++;
            sessionStorage.setItem('mspi_pageviews', this.pageViewCount.toString());
        }
    };

    // Event Queue for batching
    const EventQueue = {
        queue: [],
        maxSize: 10,
        flushInterval: 5000,
        timer: null,

        init() {
            this.timer = setInterval(() => this.flush(), this.flushInterval);
            window.addEventListener('beforeunload', () => this.flush(true));
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this.flush(true);
            });
        },

        add(event) {
            this.queue.push(event);
            if (this.queue.length >= this.maxSize) {
                this.flush();
            }
        },

        flush(immediate = false) {
            if (this.queue.length === 0) return;

            const events = [...this.queue];
            this.queue = [];

            // Log to console in development
            if (ANALYTICS_CONFIG.enableConsoleLogging) {
                console.log('[MSPI Analytics] Flushing events:', events);
            }

            // Store in localStorage as backup
            this.storeLocally(events);

            // Send to analytics endpoint (if configured)
            if (ANALYTICS_CONFIG.endpoint && ANALYTICS_CONFIG.endpoint !== '/api/analytics') {
                this.sendToServer(events, immediate);
            }
        },

        storeLocally(events) {
            try {
                const stored = JSON.parse(localStorage.getItem('mspi_analytics_queue') || '[]');
                const combined = [...stored, ...events].slice(-1000); // Keep last 1000 events
                localStorage.setItem('mspi_analytics_queue', JSON.stringify(combined));
            } catch (e) {
                console.warn('[MSPI Analytics] Failed to store locally:', e);
            }
        },

        sendToServer(events, immediate) {
            const payload = JSON.stringify({
                events,
                meta: {
                    userId: SessionManager.userId,
                    sessionId: SessionManager.sessionId,
                    timestamp: new Date().toISOString()
                }
            });

            if (immediate && navigator.sendBeacon) {
                navigator.sendBeacon(ANALYTICS_CONFIG.endpoint, payload);
            } else {
                fetch(ANALYTICS_CONFIG.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true
                }).catch(e => console.warn('[MSPI Analytics] Failed to send:', e));
            }
        }
    };

    // Core Analytics Object
    window.MSPIAnalytics = {
        // Track custom event
        track(eventName, properties = {}) {
            const event = {
                event: eventName,
                properties: {
                    ...properties,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    path: window.location.pathname,
                    referrer: document.referrer,
                    userAgent: navigator.userAgent,
                    screenWidth: window.screen.width,
                    screenHeight: window.screen.height,
                    viewportWidth: window.innerWidth,
                    viewportHeight: window.innerHeight,
                    language: navigator.language,
                    platform: navigator.platform,
                    sessionId: SessionManager.sessionId,
                    userId: SessionManager.userId,
                    pageViewCount: SessionManager.pageViewCount
                }
            };

            EventQueue.add(event);
            return event;
        },

        // Track page view
        pageView(pageName = null) {
            SessionManager.incrementPageViews();
            return this.track('page_view', {
                pageName: pageName || document.title,
                pageLoadTime: performance.now()
            });
        },

        // Track click event
        click(element, context = {}) {
            const elementData = this.getElementData(element);
            return this.track('click', {
                ...elementData,
                ...context
            });
        },

        // Track form submission
        formSubmit(formName, formData = {}) {
            return this.track('form_submit', {
                formName,
                formData: this.sanitizeFormData(formData)
            });
        },

        // Track scroll depth
        scrollDepth(percentage) {
            return this.track('scroll_depth', {
                percentage,
                maxScrollDepth: this.maxScrollDepth || percentage
            });
        },

        // Track time on page
        timeOnPage(seconds) {
            return this.track('time_on_page', { seconds });
        },

        // Track outbound link
        outboundLink(url) {
            return this.track('outbound_link', { destinationUrl: url });
        },

        // Track search
        search(query, results = null) {
            return this.track('search', { query, resultsCount: results });
        },

        // Track error
        error(errorMessage, errorStack = null, context = {}) {
            return this.track('error', {
                errorMessage,
                errorStack,
                ...context
            });
        },

        // Track performance
        performance(metrics) {
            return this.track('performance', metrics);
        },

        // Track conversion
        conversion(conversionType, value = null, currency = 'USD') {
            return this.track('conversion', {
                conversionType,
                value,
                currency
            });
        },

        // Track video event
        video(action, videoId, currentTime = 0, duration = 0) {
            return this.track('video', {
                action,
                videoId,
                currentTime,
                duration,
                percentComplete: duration ? Math.round((currentTime / duration) * 100) : 0
            });
        },

        // Track language change
        languageChange(fromLang, toLang) {
            return this.track('language_change', { fromLang, toLang });
        },

        // Track CTA interaction
        ctaClick(ctaName, ctaLocation, ctaVariant = null) {
            return this.track('cta_click', {
                ctaName,
                ctaLocation,
                ctaVariant
            });
        },

        // Track feature interest
        featureInterest(featureName, interactionType) {
            return this.track('feature_interest', {
                featureName,
                interactionType
            });
        },

        // Helper: Get element data
        getElementData(element) {
            if (!element) return {};
            return {
                tagName: element.tagName,
                id: element.id || null,
                className: element.className || null,
                text: (element.innerText || '').substring(0, 100),
                href: element.href || null,
                dataTrack: element.dataset?.track || null,
                dataCategory: element.dataset?.category || null
            };
        },

        // Helper: Sanitize form data (remove sensitive fields)
        sanitizeFormData(formData) {
            const sensitiveFields = ['password', 'credit_card', 'ssn', 'token', 'secret'];
            const sanitized = {};
            for (const [key, value] of Object.entries(formData)) {
                if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        },

        // Get stored analytics data
        getStoredData() {
            return JSON.parse(localStorage.getItem('mspi_analytics_queue') || '[]');
        },

        // Clear stored analytics data
        clearStoredData() {
            localStorage.removeItem('mspi_analytics_queue');
        },

        // Export analytics data
        exportData() {
            return {
                events: this.getStoredData(),
                user: {
                    userId: SessionManager.userId,
                    firstVisit: localStorage.getItem('mspi_user_first_visit')
                },
                session: {
                    sessionId: SessionManager.sessionId,
                    pageViews: SessionManager.pageViewCount
                }
            };
        }
    };

    // Auto-tracking Setup
    const AutoTracker = {
        maxScrollDepth: 0,
        scrollDepthTracked: new Set(),
        timeOnPageInterval: null,
        startTime: Date.now(),

        init() {
            this.trackPageView();
            this.setupClickTracking();
            this.setupScrollTracking();
            this.setupTimeTracking();
            this.setupFormTracking();
            this.setupErrorTracking();
            this.setupPerformanceTracking();
            this.setupVisibilityTracking();
            this.setupOutboundLinks();
        },

        trackPageView() {
            MSPIAnalytics.pageView();
        },

        setupClickTracking() {
            document.addEventListener('click', (e) => {
                const target = e.target.closest('a, button, [data-track]');
                if (target) {
                    MSPIAnalytics.click(target, {
                        x: e.clientX,
                        y: e.clientY
                    });

                    // Track specific CTAs
                    if (target.classList.contains('primary') || target.dataset.track === 'cta') {
                        MSPIAnalytics.ctaClick(
                            target.innerText || target.dataset.trackName,
                            target.dataset.trackLocation || 'unknown',
                            target.dataset.trackVariant
                        );
                    }
                }
            });
        },

        setupScrollTracking() {
            let ticking = false;

            const checkScrollDepth = () => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);

                if (scrollPercent > this.maxScrollDepth) {
                    this.maxScrollDepth = scrollPercent;
                    MSPIAnalytics.maxScrollDepth = scrollPercent;
                }

                ANALYTICS_CONFIG.scrollDepthMarks.forEach(mark => {
                    if (scrollPercent >= mark && !this.scrollDepthTracked.has(mark)) {
                        this.scrollDepthTracked.add(mark);
                        MSPIAnalytics.scrollDepth(mark);
                    }
                });

                ticking = false;
            };

            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(checkScrollDepth);
                    ticking = true;
                }
            });
        },

        setupTimeTracking() {
            // Track time on page every 30 seconds
            this.timeOnPageInterval = setInterval(() => {
                const seconds = Math.round((Date.now() - this.startTime) / 1000);
                if (seconds % 30 === 0) {
                    MSPIAnalytics.timeOnPage(seconds);
                }
            }, 1000);

            // Track on page unload
            window.addEventListener('beforeunload', () => {
                const seconds = Math.round((Date.now() - this.startTime) / 1000);
                MSPIAnalytics.timeOnPage(seconds);
            });
        },

        setupFormTracking() {
            document.addEventListener('submit', (e) => {
                const form = e.target;
                if (form.tagName === 'FORM') {
                    const formData = new FormData(form);
                    const data = {};
                    formData.forEach((value, key) => {
                        data[key] = typeof value === 'string' ? value : '[FILE]';
                    });
                    MSPIAnalytics.formSubmit(form.id || form.name || 'unknown_form', data);
                }
            });
        },

        setupErrorTracking() {
            window.addEventListener('error', (e) => {
                MSPIAnalytics.error(e.message, e.error?.stack, {
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno
                });
            });

            window.addEventListener('unhandledrejection', (e) => {
                MSPIAnalytics.error('Unhandled Promise Rejection', e.reason?.stack || String(e.reason));
            });
        },

        setupPerformanceTracking() {
            if (window.performance && window.performance.timing) {
                window.addEventListener('load', () => {
                    setTimeout(() => {
                        const timing = window.performance.timing;
                        const metrics = {
                            dns: timing.domainLookupEnd - timing.domainLookupStart,
                            tcp: timing.connectEnd - timing.connectStart,
                            ttfb: timing.responseStart - timing.requestStart,
                            download: timing.responseEnd - timing.responseStart,
                            domInteractive: timing.domInteractive - timing.navigationStart,
                            domComplete: timing.domComplete - timing.navigationStart,
                            loadComplete: timing.loadEventEnd - timing.navigationStart
                        };
                        MSPIAnalytics.performance(metrics);
                    }, 100);
                });
            }

            // Core Web Vitals
            if ('web-vital' in window || typeof PerformanceObserver !== 'undefined') {
                try {
                    // LCP (Largest Contentful Paint)
                    new PerformanceObserver((entryList) => {
                        const entries = entryList.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        MSPIAnalytics.track('web_vital', {
                            name: 'LCP',
                            value: lastEntry.startTime
                        });
                    }).observe({ type: 'largest-contentful-paint', buffered: true });

                    // FID (First Input Delay)
                    new PerformanceObserver((entryList) => {
                        const entries = entryList.getEntries();
                        entries.forEach(entry => {
                            MSPIAnalytics.track('web_vital', {
                                name: 'FID',
                                value: entry.processingStart - entry.startTime
                            });
                        });
                    }).observe({ type: 'first-input', buffered: true });

                    // CLS (Cumulative Layout Shift)
                    let clsValue = 0;
                    new PerformanceObserver((entryList) => {
                        for (const entry of entryList.getEntries()) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        }
                        MSPIAnalytics.track('web_vital', {
                            name: 'CLS',
                            value: clsValue
                        });
                    }).observe({ type: 'layout-shift', buffered: true });
                } catch (e) {
                    // PerformanceObserver not supported
                }
            }
        },

        setupVisibilityTracking() {
            let hiddenTime = 0;
            let lastHiddenAt = null;

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    lastHiddenAt = Date.now();
                    MSPIAnalytics.track('tab_hidden');
                } else {
                    if (lastHiddenAt) {
                        hiddenTime += Date.now() - lastHiddenAt;
                    }
                    MSPIAnalytics.track('tab_visible', { hiddenDuration: hiddenTime });
                }
            });
        },

        setupOutboundLinks() {
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a[href]');
                if (link && link.hostname !== window.location.hostname) {
                    MSPIAnalytics.outboundLink(link.href);
                }
            });
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            SessionManager.init();
            EventQueue.init();
            AutoTracker.init();
        });
    } else {
        SessionManager.init();
        EventQueue.init();
        AutoTracker.init();
    }

    // Expose for debugging
    window.MSPIAnalytics._debug = {
        SessionManager,
        EventQueue,
        AutoTracker,
        config: ANALYTICS_CONFIG
    };

})();
