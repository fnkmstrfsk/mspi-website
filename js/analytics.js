/**
 * MSPI Analytics & Intelligence System v2.0
 * Enterprise-grade tracking for marketing, SEO, and user engagement
 *
 * Features:
 * - Google Analytics 4 Integration
 * - UTM Parameter & Campaign Tracking
 * - Marketing Attribution (First/Last Touch)
 * - User Journey & Funnel Analysis
 * - Calculator & Interactive Element Tracking
 * - Heatmap Data Collection
 * - Core Web Vitals & Performance
 * - Real-time Event Streaming
 * - Session Recording Metadata
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const CONFIG = {
        // Google Analytics 4
        GA4_MEASUREMENT_ID: 'G-TMRRTDCEDD',

        // Custom Analytics Endpoint
        ANALYTICS_ENDPOINT: null, // Set to your endpoint URL when ready
        WEBHOOK_URL: null, // Optional: real-time webhook

        // Settings
        SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
        SCROLL_DEPTH_MARKS: [10, 25, 50, 75, 90, 100],
        ENGAGEMENT_TIME_MARKS: [10, 30, 60, 120, 300], // seconds
        BATCH_SIZE: 10,
        FLUSH_INTERVAL: 5000,

        // Feature Flags
        ENABLE_GA4: true,
        ENABLE_CONSOLE_LOG: false, // Production mode
        ENABLE_HEATMAP: true,
        ENABLE_SESSION_RECORDING_META: true,
        ENABLE_RAGE_CLICK_DETECTION: true,

        // Version
        VERSION: '2.0.0'
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // GOOGLE ANALYTICS 4 INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════

    const GA4 = {
        initialized: false,

        init() {
            if (!CONFIG.ENABLE_GA4 || CONFIG.GA4_MEASUREMENT_ID === 'G-XXXXXXXXXX') {
                console.log('[MSPI Analytics] GA4 not configured - skipping');
                return;
            }

            // Load GA4 script
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA4_MEASUREMENT_ID}`;
            document.head.appendChild(script);

            window.dataLayer = window.dataLayer || [];
            window.gtag = function() { dataLayer.push(arguments); };
            gtag('js', new Date());
            gtag('config', CONFIG.GA4_MEASUREMENT_ID, {
                send_page_view: false, // We'll send manually for more control
                cookie_flags: 'SameSite=None;Secure'
            });

            this.initialized = true;
            console.log('[MSPI Analytics] GA4 initialized');
        },

        event(name, params = {}) {
            if (this.initialized && window.gtag) {
                gtag('event', name, params);
            }
        },

        pageView(path, title) {
            if (this.initialized && window.gtag) {
                gtag('event', 'page_view', {
                    page_path: path,
                    page_title: title,
                    page_location: window.location.href
                });
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // UTM & CAMPAIGN TRACKING
    // ═══════════════════════════════════════════════════════════════════════════

    const CampaignTracker = {
        currentCampaign: null,
        firstTouch: null,
        lastTouch: null,

        init() {
            this.parseUTMParameters();
            this.loadStoredAttribution();
            this.detectTrafficSource();
        },

        parseUTMParameters() {
            const params = new URLSearchParams(window.location.search);
            const utmParams = {
                utm_source: params.get('utm_source'),
                utm_medium: params.get('utm_medium'),
                utm_campaign: params.get('utm_campaign'),
                utm_content: params.get('utm_content'),
                utm_term: params.get('utm_term'),
                gclid: params.get('gclid'), // Google Ads
                fbclid: params.get('fbclid'), // Facebook
                msclkid: params.get('msclkid'), // Microsoft Ads
                li_fat_id: params.get('li_fat_id'), // LinkedIn
                ref: params.get('ref'), // Custom referral
                source: params.get('source') // Generic source
            };

            // Only set if we have UTM data
            const hasUTM = Object.values(utmParams).some(v => v);
            if (hasUTM) {
                this.currentCampaign = {
                    ...utmParams,
                    landing_page: window.location.pathname,
                    timestamp: new Date().toISOString()
                };

                // Store as last touch
                this.setLastTouch(this.currentCampaign);

                // Set first touch if not exists
                if (!this.firstTouch) {
                    this.setFirstTouch(this.currentCampaign);
                }
            }
        },

        detectTrafficSource() {
            const referrer = document.referrer;

            if (!referrer) {
                this.trafficSource = { type: 'direct', source: 'direct' };
            } else if (referrer.includes('google.')) {
                this.trafficSource = { type: 'organic', source: 'google', engine: 'google' };
            } else if (referrer.includes('bing.')) {
                this.trafficSource = { type: 'organic', source: 'bing', engine: 'bing' };
            } else if (referrer.includes('duckduckgo.')) {
                this.trafficSource = { type: 'organic', source: 'duckduckgo', engine: 'duckduckgo' };
            } else if (referrer.includes('linkedin.')) {
                this.trafficSource = { type: 'social', source: 'linkedin', platform: 'linkedin' };
            } else if (referrer.includes('twitter.') || referrer.includes('x.com')) {
                this.trafficSource = { type: 'social', source: 'twitter', platform: 'twitter' };
            } else if (referrer.includes('facebook.') || referrer.includes('fb.')) {
                this.trafficSource = { type: 'social', source: 'facebook', platform: 'facebook' };
            } else if (referrer.includes('youtube.')) {
                this.trafficSource = { type: 'social', source: 'youtube', platform: 'youtube' };
            } else if (referrer.includes('reddit.')) {
                this.trafficSource = { type: 'social', source: 'reddit', platform: 'reddit' };
            } else {
                this.trafficSource = {
                    type: 'referral',
                    source: new URL(referrer).hostname,
                    referrer: referrer
                };
            }

            // Override with UTM if present
            if (this.currentCampaign?.utm_source) {
                this.trafficSource.source = this.currentCampaign.utm_source;
                this.trafficSource.medium = this.currentCampaign.utm_medium;
                this.trafficSource.campaign = this.currentCampaign.utm_campaign;
            }
        },

        loadStoredAttribution() {
            try {
                this.firstTouch = JSON.parse(localStorage.getItem('mspi_first_touch'));
                this.lastTouch = JSON.parse(localStorage.getItem('mspi_last_touch'));
            } catch (e) {
                // Invalid JSON, reset
            }
        },

        setFirstTouch(data) {
            this.firstTouch = data;
            localStorage.setItem('mspi_first_touch', JSON.stringify(data));
        },

        setLastTouch(data) {
            this.lastTouch = data;
            localStorage.setItem('mspi_last_touch', JSON.stringify(data));
        },

        getAttribution() {
            return {
                first_touch: this.firstTouch,
                last_touch: this.lastTouch,
                current_campaign: this.currentCampaign,
                traffic_source: this.trafficSource
            };
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // SESSION & USER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    const SessionManager = {
        userId: null,
        sessionId: null,
        sessionStart: null,
        pageViewCount: 0,
        isNewUser: false,
        isNewSession: false,

        init() {
            this.userId = this.getOrCreateUserId();
            this.sessionId = this.getOrCreateSessionId();
            this.sessionStart = Date.now();
            this.pageViewCount = parseInt(sessionStorage.getItem('mspi_pv') || '0');
        },

        getOrCreateUserId() {
            let userId = localStorage.getItem('mspi_uid');
            if (!userId) {
                userId = 'u_' + this.generateId();
                localStorage.setItem('mspi_uid', userId);
                localStorage.setItem('mspi_first_seen', new Date().toISOString());
                localStorage.setItem('mspi_visit_count', '1');
                this.isNewUser = true;
            } else {
                const visitCount = parseInt(localStorage.getItem('mspi_visit_count') || '1');
                localStorage.setItem('mspi_visit_count', (visitCount + 1).toString());
            }
            return userId;
        },

        getOrCreateSessionId() {
            const lastActivity = sessionStorage.getItem('mspi_last_act');
            let sessionId = sessionStorage.getItem('mspi_sid');

            const isExpired = lastActivity && (Date.now() - parseInt(lastActivity) > CONFIG.SESSION_TIMEOUT);

            if (!sessionId || isExpired) {
                sessionId = 's_' + this.generateId();
                sessionStorage.setItem('mspi_sid', sessionId);
                sessionStorage.setItem('mspi_ses_start', Date.now().toString());
                sessionStorage.setItem('mspi_pv', '0');
                sessionStorage.setItem('mspi_journey', JSON.stringify([]));
                this.isNewSession = true;
            }

            sessionStorage.setItem('mspi_last_act', Date.now().toString());
            return sessionId;
        },

        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 12);
        },

        incrementPageViews() {
            this.pageViewCount++;
            sessionStorage.setItem('mspi_pv', this.pageViewCount.toString());
        },

        addToJourney(page) {
            try {
                const journey = JSON.parse(sessionStorage.getItem('mspi_journey') || '[]');
                journey.push({
                    path: page,
                    timestamp: Date.now(),
                    title: document.title
                });
                // Keep last 50 pages
                sessionStorage.setItem('mspi_journey', JSON.stringify(journey.slice(-50)));
            } catch (e) {}
        },

        getJourney() {
            try {
                return JSON.parse(sessionStorage.getItem('mspi_journey') || '[]');
            } catch (e) {
                return [];
            }
        },

        getSessionDuration() {
            const start = parseInt(sessionStorage.getItem('mspi_ses_start') || Date.now());
            return Math.round((Date.now() - start) / 1000);
        },

        getUserData() {
            return {
                user_id: this.userId,
                session_id: this.sessionId,
                is_new_user: this.isNewUser,
                is_new_session: this.isNewSession,
                page_view_count: this.pageViewCount,
                session_duration: this.getSessionDuration(),
                visit_count: parseInt(localStorage.getItem('mspi_visit_count') || '1'),
                first_seen: localStorage.getItem('mspi_first_seen'),
                journey: this.getJourney()
            };
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENT QUEUE & TRANSMISSION
    // ═══════════════════════════════════════════════════════════════════════════

    const EventQueue = {
        queue: [],
        timer: null,

        init() {
            this.timer = setInterval(() => this.flush(), CONFIG.FLUSH_INTERVAL);
            window.addEventListener('beforeunload', () => this.flush(true));
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') this.flush(true);
            });
        },

        add(event) {
            this.queue.push(event);

            // Log to console
            if (CONFIG.ENABLE_CONSOLE_LOG) {
                console.log('[MSPI Analytics]', event.event, event.properties);
            }

            if (this.queue.length >= CONFIG.BATCH_SIZE) {
                this.flush();
            }
        },

        flush(immediate = false) {
            if (this.queue.length === 0) return;

            const events = [...this.queue];
            this.queue = [];

            // Store locally
            this.storeLocally(events);

            // Send to custom endpoint
            if (CONFIG.ANALYTICS_ENDPOINT) {
                this.sendToEndpoint(events, immediate);
            }

            // Send to webhook for real-time
            if (CONFIG.WEBHOOK_URL && immediate) {
                this.sendToWebhook(events);
            }
        },

        storeLocally(events) {
            try {
                const stored = JSON.parse(localStorage.getItem('mspi_events') || '[]');
                const combined = [...stored, ...events].slice(-5000);
                localStorage.setItem('mspi_events', JSON.stringify(combined));
                localStorage.setItem('mspi_events_count', combined.length.toString());
            } catch (e) {}
        },

        sendToEndpoint(events, immediate) {
            const payload = JSON.stringify({
                events,
                meta: {
                    ...SessionManager.getUserData(),
                    ...CampaignTracker.getAttribution(),
                    sent_at: new Date().toISOString()
                }
            });

            if (immediate && navigator.sendBeacon) {
                navigator.sendBeacon(CONFIG.ANALYTICS_ENDPOINT, payload);
            } else {
                fetch(CONFIG.ANALYTICS_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload,
                    keepalive: true
                }).catch(() => {});
            }
        },

        sendToWebhook(events) {
            fetch(CONFIG.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events, timestamp: Date.now() })
            }).catch(() => {});
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // HEATMAP DATA COLLECTION
    // ═══════════════════════════════════════════════════════════════════════════

    const HeatmapCollector = {
        clicks: [],
        moves: [],
        lastMoveTime: 0,

        init() {
            if (!CONFIG.ENABLE_HEATMAP) return;

            // Track clicks with coordinates
            document.addEventListener('click', (e) => {
                this.clicks.push({
                    x: e.pageX,
                    y: e.pageY,
                    viewportX: e.clientX,
                    viewportY: e.clientY,
                    timestamp: Date.now(),
                    target: this.getElementPath(e.target),
                    scrollY: window.scrollY
                });

                // Keep last 500 clicks
                if (this.clicks.length > 500) {
                    this.clicks = this.clicks.slice(-500);
                }
            });

            // Track mouse movement (throttled)
            document.addEventListener('mousemove', (e) => {
                const now = Date.now();
                if (now - this.lastMoveTime > 100) { // Max 10/second
                    this.moves.push({
                        x: e.pageX,
                        y: e.pageY,
                        timestamp: now
                    });
                    this.lastMoveTime = now;

                    // Keep last 1000 moves
                    if (this.moves.length > 1000) {
                        this.moves = this.moves.slice(-1000);
                    }
                }
            });
        },

        getElementPath(el) {
            const path = [];
            while (el && el.nodeType === Node.ELEMENT_NODE) {
                let selector = el.tagName.toLowerCase();
                if (el.id) {
                    selector += '#' + el.id;
                } else if (el.className && typeof el.className === 'string') {
                    selector += '.' + el.className.split(' ').filter(c => c).join('.');
                }
                path.unshift(selector);
                el = el.parentNode;
            }
            return path.slice(-5).join(' > ');
        },

        getData() {
            return {
                clicks: this.clicks,
                moves: this.moves,
                pageHeight: document.documentElement.scrollHeight,
                pageWidth: document.documentElement.scrollWidth
            };
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RAGE CLICK DETECTION
    // ═══════════════════════════════════════════════════════════════════════════

    const RageClickDetector = {
        clickTimes: [],
        clickPositions: [],

        init() {
            if (!CONFIG.ENABLE_RAGE_CLICK_DETECTION) return;

            document.addEventListener('click', (e) => {
                const now = Date.now();
                this.clickTimes.push(now);
                this.clickPositions.push({ x: e.clientX, y: e.clientY });

                // Keep last 10 clicks
                if (this.clickTimes.length > 10) {
                    this.clickTimes.shift();
                    this.clickPositions.shift();
                }

                // Check for rage click (3+ clicks within 500ms in same area)
                if (this.clickTimes.length >= 3) {
                    const recentClicks = this.clickTimes.slice(-3);
                    const recentPositions = this.clickPositions.slice(-3);

                    const timeSpan = recentClicks[2] - recentClicks[0];
                    const sameArea = this.isInSameArea(recentPositions);

                    if (timeSpan < 500 && sameArea) {
                        MSPIAnalytics.track('rage_click', {
                            x: e.clientX,
                            y: e.clientY,
                            target: HeatmapCollector.getElementPath(e.target),
                            click_count: 3,
                            time_span: timeSpan
                        });
                    }
                }
            });
        },

        isInSameArea(positions) {
            const threshold = 50; // pixels
            for (let i = 1; i < positions.length; i++) {
                const dx = Math.abs(positions[i].x - positions[0].x);
                const dy = Math.abs(positions[i].y - positions[0].y);
                if (dx > threshold || dy > threshold) return false;
            }
            return true;
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN ANALYTICS API
    // ═══════════════════════════════════════════════════════════════════════════

    window.MSPIAnalytics = {
        maxScrollDepth: 0,
        engagementStartTime: Date.now(),

        // Core tracking method
        track(eventName, properties = {}) {
            const event = {
                event: eventName,
                properties: {
                    ...properties,

                    // Timestamp
                    timestamp: new Date().toISOString(),
                    local_time: new Date().toLocaleString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

                    // Page info
                    url: window.location.href,
                    path: window.location.pathname,
                    query_string: window.location.search,
                    hash: window.location.hash,
                    title: document.title,
                    referrer: document.referrer,

                    // Session info
                    session_id: SessionManager.sessionId,
                    user_id: SessionManager.userId,
                    page_view_number: SessionManager.pageViewCount,
                    session_duration: SessionManager.getSessionDuration(),

                    // Device info
                    screen_width: window.screen.width,
                    screen_height: window.screen.height,
                    viewport_width: window.innerWidth,
                    viewport_height: window.innerHeight,
                    device_pixel_ratio: window.devicePixelRatio,

                    // Browser info
                    language: navigator.language,
                    languages: navigator.languages?.join(','),
                    platform: navigator.platform,
                    user_agent: navigator.userAgent,
                    is_mobile: /Mobile|Android|iPhone/i.test(navigator.userAgent),
                    is_tablet: /iPad|Tablet/i.test(navigator.userAgent),

                    // Attribution
                    ...CampaignTracker.getAttribution()?.traffic_source
                },
                version: CONFIG.VERSION
            };

            EventQueue.add(event);

            // Send to GA4
            GA4.event(eventName, properties);

            return event;
        },

        // ─────────────────────────────────────────────────────────────────────
        // PAGE TRACKING
        // ─────────────────────────────────────────────────────────────────────

        pageView(pageName = null) {
            SessionManager.incrementPageViews();
            SessionManager.addToJourney(window.location.pathname);

            GA4.pageView(window.location.pathname, document.title);

            return this.track('page_view', {
                page_name: pageName || document.title,
                page_load_time: Math.round(performance.now()),
                is_landing_page: SessionManager.pageViewCount === 1,
                entry_page: SessionManager.getJourney()[0]?.path
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // ENGAGEMENT TRACKING
        // ─────────────────────────────────────────────────────────────────────

        scrollDepth(percentage) {
            if (percentage > this.maxScrollDepth) {
                this.maxScrollDepth = percentage;
            }
            return this.track('scroll_depth', {
                percentage,
                max_scroll_depth: this.maxScrollDepth,
                page_height: document.documentElement.scrollHeight
            });
        },

        timeOnPage(seconds) {
            return this.track('time_on_page', {
                seconds,
                minutes: Math.round(seconds / 60 * 10) / 10,
                engaged_time: Math.round((Date.now() - this.engagementStartTime) / 1000)
            });
        },

        engagement(engagementType, details = {}) {
            return this.track('engagement', {
                engagement_type: engagementType,
                ...details
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // CLICK & INTERACTION TRACKING
        // ─────────────────────────────────────────────────────────────────────

        click(element, context = {}) {
            return this.track('click', {
                ...this.getElementData(element),
                ...context
            });
        },

        ctaClick(ctaName, ctaLocation, ctaType = 'button') {
            GA4.event('cta_click', { cta_name: ctaName, cta_location: ctaLocation });

            return this.track('cta_click', {
                cta_name: ctaName,
                cta_location: ctaLocation,
                cta_type: ctaType,
                session_cta_clicks: this.incrementCounter('cta_clicks')
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // CALCULATOR TRACKING
        // ─────────────────────────────────────────────────────────────────────

        calculatorInteraction(action, data = {}) {
            return this.track('calculator_interaction', {
                action, // 'view', 'input_change', 'result_view', 'cta_click'
                ...data
            });
        },

        calculatorResult(mrr, technicians, endpoints, result) {
            GA4.event('calculator_complete', {
                mrr: mrr,
                estimated_recovery: result
            });

            return this.track('calculator_result', {
                input_mrr: mrr,
                input_technicians: technicians,
                input_endpoints: endpoints,
                estimated_annual_recovery: result,
                recovery_percentage: mrr > 0 ? Math.round((result / (mrr * 12)) * 100) : 0
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // FAQ TRACKING
        // ─────────────────────────────────────────────────────────────────────

        faqInteraction(action, questionText, questionIndex) {
            return this.track('faq_interaction', {
                action, // 'open', 'close'
                question: questionText.substring(0, 100),
                question_index: questionIndex,
                session_faq_opens: this.incrementCounter('faq_opens')
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // FORM TRACKING
        // ─────────────────────────────────────────────────────────────────────

        formStart(formName) {
            return this.track('form_start', {
                form_name: formName,
                timestamp_start: Date.now()
            });
        },

        formFieldInteraction(formName, fieldName, action) {
            return this.track('form_field', {
                form_name: formName,
                field_name: fieldName,
                action // 'focus', 'blur', 'change'
            });
        },

        formSubmit(formName, success = true, errorMessage = null) {
            GA4.event('form_submit', { form_name: formName, success });

            return this.track('form_submit', {
                form_name: formName,
                success,
                error_message: errorMessage,
                session_form_submits: this.incrementCounter('form_submits')
            });
        },

        formAbandonment(formName, lastField, percentComplete) {
            return this.track('form_abandonment', {
                form_name: formName,
                last_field: lastField,
                percent_complete: percentComplete
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // CONVERSION TRACKING
        // ─────────────────────────────────────────────────────────────────────

        conversion(conversionType, value = null, currency = 'USD') {
            GA4.event('conversion', {
                conversion_type: conversionType,
                value: value,
                currency: currency
            });

            return this.track('conversion', {
                conversion_type: conversionType,
                value,
                currency,
                attribution: CampaignTracker.getAttribution()
            });
        },

        leadCapture(leadType, leadScore = null) {
            GA4.event('generate_lead', { lead_type: leadType });

            return this.track('lead_capture', {
                lead_type: leadType, // 'demo_request', 'contact_form', 'newsletter'
                lead_score: leadScore,
                attribution: CampaignTracker.getAttribution(),
                journey: SessionManager.getJourney()
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // TESTIMONIAL & SOCIAL PROOF TRACKING
        // ─────────────────────────────────────────────────────────────────────

        testimonialView(testimonialId, testimonialAuthor) {
            return this.track('testimonial_view', {
                testimonial_id: testimonialId,
                testimonial_author: testimonialAuthor,
                view_duration: 0 // Will be updated on scroll away
            });
        },

        socialProofInteraction(proofType, details = {}) {
            return this.track('social_proof_interaction', {
                proof_type: proofType, // 'testimonial', 'stat', 'logo', 'badge'
                ...details
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // PERFORMANCE & ERRORS
        // ─────────────────────────────────────────────────────────────────────

        performance(metrics) {
            return this.track('performance', metrics);
        },

        webVital(name, value, rating = null) {
            return this.track('web_vital', {
                vital_name: name, // 'LCP', 'FID', 'CLS', 'TTFB', 'FCP'
                vital_value: value,
                vital_rating: rating // 'good', 'needs-improvement', 'poor'
            });
        },

        error(message, stack = null, context = {}) {
            return this.track('error', {
                error_message: message,
                error_stack: stack,
                ...context
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // NAVIGATION & EXIT TRACKING
        // ─────────────────────────────────────────────────────────────────────

        outboundLink(url, linkText = null) {
            return this.track('outbound_link', {
                destination_url: url,
                destination_domain: new URL(url).hostname,
                link_text: linkText
            });
        },

        internalNavigation(fromPath, toPath, navType = 'link') {
            return this.track('internal_navigation', {
                from_path: fromPath,
                to_path: toPath,
                navigation_type: navType // 'link', 'menu', 'footer', 'cta'
            });
        },

        exitIntent() {
            return this.track('exit_intent', {
                time_on_page: Math.round((Date.now() - this.engagementStartTime) / 1000),
                max_scroll_depth: this.maxScrollDepth,
                journey: SessionManager.getJourney()
            });
        },

        // ─────────────────────────────────────────────────────────────────────
        // HELPER METHODS
        // ─────────────────────────────────────────────────────────────────────

        getElementData(element) {
            if (!element) return {};
            return {
                tag_name: element.tagName?.toLowerCase(),
                element_id: element.id || null,
                element_classes: element.className || null,
                element_text: (element.innerText || '').substring(0, 100),
                element_href: element.href || null,
                data_track: element.dataset?.track || null,
                data_category: element.dataset?.category || null,
                data_label: element.dataset?.label || null
            };
        },

        incrementCounter(name) {
            const key = `mspi_counter_${name}`;
            const count = parseInt(sessionStorage.getItem(key) || '0') + 1;
            sessionStorage.setItem(key, count.toString());
            return count;
        },

        // ─────────────────────────────────────────────────────────────────────
        // DATA EXPORT
        // ─────────────────────────────────────────────────────────────────────

        getStoredEvents() {
            try {
                return JSON.parse(localStorage.getItem('mspi_events') || '[]');
            } catch (e) {
                return [];
            }
        },

        getAnalyticsSummary() {
            const events = this.getStoredEvents();
            const now = Date.now();
            const last24h = events.filter(e => {
                const eventTime = new Date(e.properties?.timestamp).getTime();
                return now - eventTime < 24 * 60 * 60 * 1000;
            });

            return {
                total_events: events.length,
                events_last_24h: last24h.length,
                user: SessionManager.getUserData(),
                attribution: CampaignTracker.getAttribution(),
                heatmap: HeatmapCollector.getData(),
                page_views: events.filter(e => e.event === 'page_view').length,
                cta_clicks: events.filter(e => e.event === 'cta_click').length,
                conversions: events.filter(e => e.event === 'conversion').length
            };
        },

        exportData(format = 'json') {
            const data = {
                events: this.getStoredEvents(),
                summary: this.getAnalyticsSummary(),
                exported_at: new Date().toISOString()
            };

            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            }
            return data;
        },

        clearData() {
            localStorage.removeItem('mspi_events');
            sessionStorage.clear();
            console.log('[MSPI Analytics] Data cleared');
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-TRACKING SETUP
    // ═══════════════════════════════════════════════════════════════════════════

    const AutoTracker = {
        scrollDepthTracked: new Set(),
        engagementTimeTracked: new Set(),
        startTime: Date.now(),
        formStartTimes: new Map(),

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
            this.setupExitIntent();
            this.setupCalculatorTracking();
            this.setupFAQTracking();
            this.setupStickyCtaTracking();
        },

        trackPageView() {
            MSPIAnalytics.pageView();
        },

        setupClickTracking() {
            document.addEventListener('click', (e) => {
                const target = e.target.closest('a, button, [data-track]');
                if (!target) return;

                MSPIAnalytics.click(target, {
                    click_x: e.clientX,
                    click_y: e.clientY,
                    page_x: e.pageX,
                    page_y: e.pageY
                });

                // Track CTAs specifically
                if (target.classList.contains('btn-primary') ||
                    target.classList.contains('btn') ||
                    target.dataset.track === 'cta') {

                    const ctaName = target.innerText?.trim() || target.dataset.trackName || 'Unknown CTA';
                    const ctaLocation = this.getCtaLocation(target);

                    MSPIAnalytics.ctaClick(ctaName, ctaLocation);
                }
            });
        },

        getCtaLocation(element) {
            // Determine CTA location based on parent sections
            const hero = element.closest('.hero');
            const nav = element.closest('.nav');
            const footer = element.closest('.footer');
            const sticky = element.closest('.sticky-cta');
            const cta = element.closest('.cta-section');
            const calculator = element.closest('.section-calculator');

            if (hero) return 'hero';
            if (nav) return 'navigation';
            if (footer) return 'footer';
            if (sticky) return 'sticky_cta';
            if (cta) return 'cta_section';
            if (calculator) return 'calculator';

            return 'page_body';
        },

        setupScrollTracking() {
            let ticking = false;

            const checkScroll = () => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);

                CONFIG.SCROLL_DEPTH_MARKS.forEach(mark => {
                    if (scrollPercent >= mark && !this.scrollDepthTracked.has(mark)) {
                        this.scrollDepthTracked.add(mark);
                        MSPIAnalytics.scrollDepth(mark);
                    }
                });

                ticking = false;
            };

            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(checkScroll);
                    ticking = true;
                }
            }, { passive: true });
        },

        setupTimeTracking() {
            // Track engagement time milestones
            setInterval(() => {
                const seconds = Math.round((Date.now() - this.startTime) / 1000);

                CONFIG.ENGAGEMENT_TIME_MARKS.forEach(mark => {
                    if (seconds >= mark && !this.engagementTimeTracked.has(mark)) {
                        this.engagementTimeTracked.add(mark);
                        MSPIAnalytics.timeOnPage(mark);
                        MSPIAnalytics.engagement('time_milestone', { seconds: mark });
                    }
                });
            }, 1000);

            // Track on unload
            window.addEventListener('beforeunload', () => {
                const seconds = Math.round((Date.now() - this.startTime) / 1000);
                MSPIAnalytics.timeOnPage(seconds);
            });
        },

        setupFormTracking() {
            // Track form focus (start)
            document.addEventListener('focusin', (e) => {
                const form = e.target.closest('form');
                if (form && !this.formStartTimes.has(form)) {
                    this.formStartTimes.set(form, Date.now());
                    MSPIAnalytics.formStart(form.id || form.name || 'contact_form');
                }

                if (e.target.matches('input, textarea, select')) {
                    const form = e.target.closest('form');
                    const formName = form?.id || form?.name || 'unknown_form';
                    MSPIAnalytics.formFieldInteraction(formName, e.target.name || e.target.id, 'focus');
                }
            });

            // Track form submission
            document.addEventListener('submit', (e) => {
                const form = e.target;
                if (form.tagName === 'FORM') {
                    const formName = form.id || form.name || 'contact_form';
                    MSPIAnalytics.formSubmit(formName, true);
                    MSPIAnalytics.leadCapture('demo_request');
                }
            });
        },

        setupErrorTracking() {
            window.addEventListener('error', (e) => {
                MSPIAnalytics.error(e.message, e.error?.stack, {
                    filename: e.filename,
                    line: e.lineno,
                    column: e.colno
                });
            });

            window.addEventListener('unhandledrejection', (e) => {
                MSPIAnalytics.error('Unhandled Promise Rejection', e.reason?.stack || String(e.reason));
            });
        },

        setupPerformanceTracking() {
            // Core Web Vitals
            if (typeof PerformanceObserver !== 'undefined') {
                try {
                    // LCP
                    new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        MSPIAnalytics.webVital('LCP', Math.round(lastEntry.startTime));
                    }).observe({ type: 'largest-contentful-paint', buffered: true });

                    // FID
                    new PerformanceObserver((list) => {
                        list.getEntries().forEach(entry => {
                            MSPIAnalytics.webVital('FID', Math.round(entry.processingStart - entry.startTime));
                        });
                    }).observe({ type: 'first-input', buffered: true });

                    // CLS
                    let clsValue = 0;
                    new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        }
                        MSPIAnalytics.webVital('CLS', Math.round(clsValue * 1000) / 1000);
                    }).observe({ type: 'layout-shift', buffered: true });
                } catch (e) {}
            }

            // Page load metrics
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const timing = performance.timing || {};
                    const nav = performance.getEntriesByType('navigation')[0] || {};

                    MSPIAnalytics.performance({
                        dns: timing.domainLookupEnd - timing.domainLookupStart,
                        tcp: timing.connectEnd - timing.connectStart,
                        ttfb: timing.responseStart - timing.requestStart,
                        dom_interactive: timing.domInteractive - timing.navigationStart,
                        dom_complete: timing.domComplete - timing.navigationStart,
                        load_complete: timing.loadEventEnd - timing.navigationStart,
                        transfer_size: nav.transferSize,
                        dom_content_loaded: nav.domContentLoadedEventEnd
                    });
                }, 100);
            });
        },

        setupVisibilityTracking() {
            let hiddenStart = null;

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    hiddenStart = Date.now();
                    MSPIAnalytics.track('tab_hidden');
                } else {
                    const hiddenDuration = hiddenStart ? Date.now() - hiddenStart : 0;
                    MSPIAnalytics.track('tab_visible', { hidden_duration_ms: hiddenDuration });
                }
            });
        },

        setupOutboundLinks() {
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a[href]');
                if (link && link.hostname !== window.location.hostname) {
                    MSPIAnalytics.outboundLink(link.href, link.innerText?.trim());
                }
            });
        },

        setupExitIntent() {
            let exitIntentFired = false;

            document.addEventListener('mouseout', (e) => {
                if (exitIntentFired) return;

                if (e.clientY < 10 && e.relatedTarget === null) {
                    exitIntentFired = true;
                    MSPIAnalytics.exitIntent();
                }
            });
        },

        setupCalculatorTracking() {
            // Track calculator section visibility
            const calcSection = document.querySelector('.section-calculator');
            if (calcSection) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            MSPIAnalytics.calculatorInteraction('view');
                            observer.disconnect();
                        }
                    });
                }, { threshold: 0.5 });
                observer.observe(calcSection);
            }

            // Track calculator input changes
            ['calc-mrr', 'calc-techs', 'calc-endpoints'].forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    input.addEventListener('change', () => {
                        MSPIAnalytics.calculatorInteraction('input_change', {
                            field: id,
                            value: input.value
                        });
                    });
                }
            });

            // Track calculator result
            const resultEl = document.getElementById('calc-result');
            if (resultEl) {
                const observer = new MutationObserver(() => {
                    const mrrInput = document.getElementById('calc-mrr');
                    const techsInput = document.getElementById('calc-techs');
                    const endpointsInput = document.getElementById('calc-endpoints');

                    if (mrrInput && techsInput && endpointsInput) {
                        const mrr = parseFloat(mrrInput.value.replace(/[$,]/g, '')) || 0;
                        const techs = parseInt(techsInput.value) || 0;
                        const endpoints = parseInt(endpointsInput.value) || 0;
                        const result = resultEl.textContent;

                        MSPIAnalytics.calculatorResult(mrr, techs, endpoints, result);
                    }
                });
                observer.observe(resultEl, { childList: true, characterData: true, subtree: true });
            }
        },

        setupFAQTracking() {
            document.querySelectorAll('.faq-question').forEach((question, index) => {
                question.addEventListener('click', () => {
                    const faqItem = question.closest('.faq-item');
                    const isOpening = !faqItem.classList.contains('open');
                    const questionText = question.innerText?.trim() || '';

                    MSPIAnalytics.faqInteraction(
                        isOpening ? 'open' : 'close',
                        questionText,
                        index
                    );
                });
            });
        },

        setupStickyCtaTracking() {
            const stickyCta = document.getElementById('sticky-cta');
            if (stickyCta) {
                let impressionTracked = false;

                const observer = new MutationObserver(() => {
                    if (stickyCta.classList.contains('visible') && !impressionTracked) {
                        impressionTracked = true;
                        MSPIAnalytics.track('sticky_cta_impression');
                    }
                });

                observer.observe(stickyCta, { attributes: true, attributeFilter: ['class'] });
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    const init = () => {
        console.log(`[MSPI Analytics] Initializing v${CONFIG.VERSION}`);

        GA4.init();
        CampaignTracker.init();
        SessionManager.init();
        EventQueue.init();
        HeatmapCollector.init();
        RageClickDetector.init();
        AutoTracker.init();

        console.log('[MSPI Analytics] Ready', {
            user_id: SessionManager.userId,
            session_id: SessionManager.sessionId,
            attribution: CampaignTracker.getAttribution()
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose debug tools
    window.MSPIAnalytics._debug = {
        CONFIG,
        GA4,
        CampaignTracker,
        SessionManager,
        EventQueue,
        HeatmapCollector,
        RageClickDetector,
        AutoTracker
    };

})();
