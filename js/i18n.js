/**
 * MSPI Internationalization (i18n) System
 * Multi-language support for the website
 */

(function() {
    'use strict';

    // Supported languages (excluding Russia and Iran)
    const SUPPORTED_LANGUAGES = {
        'en': { name: 'English', native: 'English', flag: '🇺🇸', region: 'North America' },
        'de': { name: 'German', native: 'Deutsch', flag: '🇩🇪', region: 'Europe' },
        'nl': { name: 'Dutch', native: 'Nederlands', flag: '🇳🇱', region: 'Europe' },
        'fr': { name: 'French', native: 'Français', flag: '🇫🇷', region: 'Europe' },
        'es': { name: 'Spanish', native: 'Español', flag: '🇪🇸', region: 'Europe/LATAM' },
        'pt': { name: 'Portuguese', native: 'Português', flag: '🇧🇷', region: 'Europe/LATAM' },
        'it': { name: 'Italian', native: 'Italiano', flag: '🇮🇹', region: 'Europe' },
        'pl': { name: 'Polish', native: 'Polski', flag: '🇵🇱', region: 'Europe' },
        'vi': { name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳', region: 'Asia Pacific' },
        'ja': { name: 'Japanese', native: '日本語', flag: '🇯🇵', region: 'Asia Pacific' },
        'ko': { name: 'Korean', native: '한국어', flag: '🇰🇷', region: 'Asia Pacific' },
        'th': { name: 'Thai', native: 'ไทย', flag: '🇹🇭', region: 'Asia Pacific' }
    };

    const DEFAULT_LANGUAGE = 'en';

    // Translation storage
    let translations = {};
    let currentLanguage = DEFAULT_LANGUAGE;

    // Core i18n object
    window.MSPII18n = {
        // Initialize the i18n system
        async init() {
            currentLanguage = this.detectLanguage();
            await this.loadTranslations(currentLanguage);
            this.applyTranslations();
            this.createLanguageSelector();
            this.updateHtmlLang();

            // Track language in analytics
            if (window.MSPIAnalytics) {
                window.MSPIAnalytics.track('language_detected', {
                    language: currentLanguage,
                    browserLanguage: navigator.language
                });
            }
        },

        // Detect user's preferred language
        detectLanguage() {
            // 1. Check URL parameter (explicit selection)
            const urlParams = new URLSearchParams(window.location.search);
            const urlLang = urlParams.get('lang');
            if (urlLang && SUPPORTED_LANGUAGES[urlLang]) {
                this.saveLanguagePreference(urlLang);
                return urlLang;
            }

            // 2. Check localStorage (user previously selected a language)
            const savedLang = localStorage.getItem('mspi_language');
            if (savedLang && SUPPORTED_LANGUAGES[savedLang]) {
                return savedLang;
            }

            // 3. Default to English (don't auto-detect browser language)
            return DEFAULT_LANGUAGE;
        },

        // Load translations for a language
        async loadTranslations(lang) {
            // First load English as fallback
            if (lang !== 'en' && !translations['en']) {
                translations['en'] = await this.fetchTranslations('en');
            }

            // Then load requested language
            if (!translations[lang]) {
                translations[lang] = await this.fetchTranslations(lang);
            }

            currentLanguage = lang;
        },

        // Fetch translations from JSON file
        async fetchTranslations(lang) {
            try {
                const response = await fetch(`/translations/${lang}.json`);
                if (!response.ok) throw new Error(`Failed to load ${lang}`);
                return await response.json();
            } catch (e) {
                console.warn(`[MSPI i18n] Could not load translations for ${lang}:`, e);
                return translations['en'] || {};
            }
        },

        // Get translated string
        t(key, params = {}) {
            // Try current language first, fall back to English
            let text = this.getNestedValue(translations[currentLanguage], key)
                    || this.getNestedValue(translations['en'], key)
                    || key;

            // Replace parameters
            Object.keys(params).forEach(param => {
                text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
            });

            return text;
        },

        // Get nested value from object using dot notation
        getNestedValue(obj, key) {
            if (!obj) return null;
            return key.split('.').reduce((o, k) => (o || {})[k], obj);
        },

        // Apply translations to DOM elements
        applyTranslations() {
            // Translate elements with data-i18n attribute
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const translation = this.t(key);

                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (el.placeholder) el.placeholder = translation;
                } else {
                    el.textContent = translation;
                }
            });

            // Translate elements with data-i18n-html (allows HTML)
            document.querySelectorAll('[data-i18n-html]').forEach(el => {
                const key = el.getAttribute('data-i18n-html');
                el.innerHTML = this.t(key);
            });

            // Translate attributes
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                el.title = this.t(el.getAttribute('data-i18n-title'));
            });

            document.querySelectorAll('[data-i18n-aria]').forEach(el => {
                el.setAttribute('aria-label', this.t(el.getAttribute('data-i18n-aria')));
            });
        },

        // Change language
        async setLanguage(lang) {
            if (!SUPPORTED_LANGUAGES[lang]) {
                console.warn(`[MSPI i18n] Language ${lang} is not supported`);
                return;
            }

            const previousLang = currentLanguage;

            await this.loadTranslations(lang);
            this.applyTranslations();
            this.updateHtmlLang();
            this.saveLanguagePreference(lang);
            this.updateLanguageSelector();

            // Track language change
            if (window.MSPIAnalytics) {
                window.MSPIAnalytics.languageChange(previousLang, lang);
            }

            // Dispatch event for other scripts
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { from: previousLang, to: lang }
            }));
        },

        // Save language preference
        saveLanguagePreference(lang) {
            localStorage.setItem('mspi_language', lang);

            // Update URL without reload
            const url = new URL(window.location);
            url.searchParams.set('lang', lang);
            window.history.replaceState({}, '', url);
        },

        // Update HTML lang attribute
        updateHtmlLang() {
            document.documentElement.lang = currentLanguage;
            document.documentElement.dir = this.isRTL(currentLanguage) ? 'rtl' : 'ltr';
        },

        // Check if language is RTL
        isRTL(lang) {
            // None of our supported languages are RTL (excluded Arabic, Persian, Hebrew)
            return false;
        },

        // Create language selector dropdown
        createLanguageSelector() {
            // Check if selector already exists
            if (document.getElementById('mspi-language-selector')) return;

            const selector = document.createElement('div');
            selector.id = 'mspi-language-selector';
            selector.className = 'language-selector';
            selector.innerHTML = `
                <button class="lang-toggle" aria-label="Select language" aria-expanded="false">
                    <span class="lang-flag">${SUPPORTED_LANGUAGES[currentLanguage].flag}</span>
                    <span class="lang-code">${currentLanguage.toUpperCase()}</span>
                    <svg class="lang-arrow" width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                        <path d="M5 6L0 0h10z"/>
                    </svg>
                </button>
                <div class="lang-dropdown" role="menu">
                    <div class="lang-regions">
                        ${this.renderLanguagesByRegion()}
                    </div>
                </div>
            `;

            // Add styles
            this.addSelectorStyles();

            // Add to page
            document.body.appendChild(selector);

            // Event handlers
            const toggle = selector.querySelector('.lang-toggle');
            const dropdown = selector.querySelector('.lang-dropdown');

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.toggle('open');
                toggle.setAttribute('aria-expanded', isOpen);
            });

            // Close on outside click
            document.addEventListener('click', () => {
                dropdown.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            });

            // Language selection
            selector.querySelectorAll('.lang-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const lang = option.dataset.lang;
                    this.setLanguage(lang);
                    dropdown.classList.remove('open');
                    toggle.setAttribute('aria-expanded', 'false');
                });
            });
        },

        // Render languages grouped by region
        renderLanguagesByRegion() {
            const regions = {};

            Object.entries(SUPPORTED_LANGUAGES).forEach(([code, lang]) => {
                if (!regions[lang.region]) {
                    regions[lang.region] = [];
                }
                regions[lang.region].push({ code, ...lang });
            });

            return Object.entries(regions).map(([region, langs]) => `
                <div class="lang-region">
                    <div class="lang-region-title">${region}</div>
                    ${langs.map(lang => `
                        <button class="lang-option ${lang.code === currentLanguage ? 'active' : ''}"
                                data-lang="${lang.code}"
                                role="menuitem">
                            <span class="lang-flag">${lang.flag}</span>
                            <span class="lang-name">${lang.native}</span>
                        </button>
                    `).join('')}
                </div>
            `).join('');
        },

        // Update selector display
        updateLanguageSelector() {
            const selector = document.getElementById('mspi-language-selector');
            if (!selector) return;

            const toggle = selector.querySelector('.lang-toggle');
            toggle.querySelector('.lang-flag').textContent = SUPPORTED_LANGUAGES[currentLanguage].flag;
            toggle.querySelector('.lang-code').textContent = currentLanguage.toUpperCase();

            // Update active state
            selector.querySelectorAll('.lang-option').forEach(option => {
                option.classList.toggle('active', option.dataset.lang === currentLanguage);
            });
        },

        // Add CSS styles for selector
        addSelectorStyles() {
            if (document.getElementById('mspi-i18n-styles')) return;

            const styles = document.createElement('style');
            styles.id = 'mspi-i18n-styles';
            styles.textContent = `
                .language-selector {
                    position: fixed;
                    bottom: 40px;
                    right: 30px;
                    z-index: 1000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .lang-toggle {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 12px;
                    background: rgba(0, 0, 0, 0.8);
                    border: 1px solid #333;
                    color: #888;
                    font-size: 11px;
                    letter-spacing: 1px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .lang-toggle:hover {
                    color: #fff;
                    border-color: #555;
                }

                .lang-flag {
                    font-size: 14px;
                }

                .lang-arrow {
                    transition: transform 0.3s ease;
                }

                .lang-dropdown.open + .lang-toggle .lang-arrow,
                .lang-toggle[aria-expanded="true"] .lang-arrow {
                    transform: rotate(180deg);
                }

                .lang-dropdown {
                    position: absolute;
                    bottom: 100%;
                    right: 0;
                    margin-bottom: 8px;
                    background: rgba(0, 0, 0, 0.95);
                    border: 1px solid #333;
                    min-width: 200px;
                    max-height: 400px;
                    overflow-y: auto;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                }

                .lang-dropdown.open {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }

                .lang-region {
                    padding: 8px 0;
                    border-bottom: 1px solid #222;
                }

                .lang-region:last-child {
                    border-bottom: none;
                }

                .lang-region-title {
                    padding: 4px 16px;
                    font-size: 9px;
                    letter-spacing: 2px;
                    color: #555;
                    text-transform: uppercase;
                }

                .lang-option {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    padding: 10px 16px;
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 13px;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .lang-option:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                }

                .lang-option.active {
                    color: #fff;
                    background: rgba(255, 255, 255, 0.1);
                }

                .lang-option .lang-flag {
                    font-size: 16px;
                }

                /* Mobile adjustments - position below nav */
                @media (max-width: 768px) {
                    .language-selector {
                        bottom: 20px;
                        top: auto;
                        right: 20px;
                    }

                    .lang-dropdown {
                        bottom: 100%;
                        top: auto;
                        margin-bottom: 8px;
                        margin-top: 0;
                    }
                }
            `;

            document.head.appendChild(styles);
        },

        // Get current language
        getCurrentLanguage() {
            return currentLanguage;
        },

        // Get supported languages
        getSupportedLanguages() {
            return { ...SUPPORTED_LANGUAGES };
        },

        // Check if language is supported
        isSupported(lang) {
            return !!SUPPORTED_LANGUAGES[lang];
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => MSPII18n.init());
    } else {
        MSPII18n.init();
    }

})();
