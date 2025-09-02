// Translation system for the Brewfather Shopping List extension

class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.supportedLanguages = ['en', 'nl', 'de', 'fr'];
    }

    // Initialize the translation system
    async init() {
        // Detect system language
        const systemLanguage = this.detectSystemLanguage();
        
        // Check if user has a saved language preference
        const result = await chrome.storage.sync.get(['language']);
        const preferredLanguage = result.language || systemLanguage;
        
        // Set the language (fallback to English if not supported)
        await this.setLanguage(preferredLanguage);
    }

    // Detect system language
    detectSystemLanguage() {
        // Get browser language
        const browserLang = navigator.language || navigator.userLanguage || 'en';
        
        // Extract language code (e.g., 'en-US' -> 'en')
        const langCode = browserLang.substring(0, 2).toLowerCase();
        
        // Return if supported, otherwise default to English
        return this.supportedLanguages.includes(langCode) ? langCode : 'en';
    }

    // Set current language and load translations
    async setLanguage(languageCode) {
        const lang = this.supportedLanguages.includes(languageCode) ? languageCode : 'en';
        
        if (this.currentLanguage !== lang || !this.translations[lang]) {
            this.currentLanguage = lang;
            await this.loadTranslations(lang);
            
            // Save language preference
            await chrome.storage.sync.set({ language: lang });
        }
    }

    // Load translations for a specific language
    async loadTranslations(languageCode) {
        try {
            const response = await fetch(chrome.runtime.getURL(`locales/${languageCode}.json`));
            if (response.ok) {
                this.translations[languageCode] = await response.json();
            } else {
                console.warn(`Failed to load translations for ${languageCode}, falling back to English`);
                if (languageCode !== 'en') {
                    await this.loadTranslations('en');
                    this.currentLanguage = 'en';
                }
            }
        } catch (error) {
            console.error(`Error loading translations for ${languageCode}:`, error);
            if (languageCode !== 'en') {
                await this.loadTranslations('en');
                this.currentLanguage = 'en';
            }
        }
    }

    // Get translation for a key with optional interpolation
    t(key, params = {}) {
        const translation = this.getTranslation(key);
        
        if (!translation) {
            console.warn(`Translation not found for key: ${key}`);
            return key;
        }

        // Handle pluralization
        if (params.count !== undefined) {
            const pluralKey = `${key}_plural`;
            const pluralTranslation = this.getTranslation(pluralKey);
            
            if (pluralTranslation && params.count !== 1) {
                return this.interpolate(pluralTranslation, params);
            }
        }

        return this.interpolate(translation, params);
    }

    // Get translation from nested object
    getTranslation(key) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (translation && typeof translation === 'object') {
                translation = translation[k];
            } else {
                return null;
            }
        }
        
        return translation;
    }

    // Interpolate parameters into translation string
    interpolate(translation, params) {
        let result = translation;
        
        for (const [key, value] of Object.entries(params)) {
            const placeholder = `{{${key}}}`;
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }
        
        return result;
    }

    // Get current language
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    // Get list of supported languages
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    // Get language display names
    getLanguageDisplayName(languageCode) {
        const displayNames = {
            'en': 'English',
            'nl': 'Nederlands',
            'de': 'Deutsch',
            'fr': 'Français'
        };
        
        return displayNames[languageCode] || languageCode;
    }
}

// Create global instance
const i18n = new I18n();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18n, i18n };
}
