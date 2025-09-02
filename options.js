// Options script for managing extension settings

document.addEventListener('DOMContentLoaded', async () => {
    await initializeOptions();
});

// DOM elements
const elements = {
    themeSelect: document.getElementById('themeSelect'),
    languageSelect: document.getElementById('languageSelect'),
    userId: document.getElementById('userId'),
    apiKey: document.getElementById('apiKey'),
    saveBtn: document.getElementById('saveBtn'),
    testBtn: document.getElementById('testBtn'),
    statusMessage: document.getElementById('statusMessage')
};

// Initialize options page
async function initializeOptions() {
    await loadSettings();
    setupEventListeners();
    updateTestButtonState();
    applyTheme();
}

// Load existing settings
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['brewfatherUserId', 'brewfatherApiKey', 'theme', 'language']);
        
        if (result.brewfatherUserId) {
            elements.userId.value = result.brewfatherUserId;
        }
        
        if (result.brewfatherApiKey) {
            elements.apiKey.value = result.brewfatherApiKey;
        }
        
        if (result.theme) {
            elements.themeSelect.value = result.theme;
        } else {
            elements.themeSelect.value = 'system'; // Default to system preference
        }
        
        if (result.language) {
            elements.languageSelect.value = result.language;
        } else {
            elements.languageSelect.value = 'system'; // Default to system language
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('Error loading existing settings', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Theme select
    elements.themeSelect.addEventListener('change', handleThemeChange);
    
    // Save button
    elements.saveBtn.addEventListener('click', saveSettings);
    
    // Test button
    elements.testBtn.addEventListener('click', testConnection);
    
    // Input fields - update test button state when values change
    elements.userId.addEventListener('input', updateTestButtonState);
    elements.apiKey.addEventListener('input', updateTestButtonState);
    
    // Allow saving with Enter key
    elements.userId.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveSettings();
    });
    
    elements.apiKey.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveSettings();
    });
}

// Update test button state based on input values
function updateTestButtonState() {
    const hasUserId = elements.userId.value.trim().length > 0;
    const hasApiKey = elements.apiKey.value.trim().length > 0;
    
    elements.testBtn.disabled = !(hasUserId && hasApiKey);
}

// Save settings
async function saveSettings() {
    const theme = elements.themeSelect.value;
    const language = elements.languageSelect.value;
    const userId = elements.userId.value.trim();
    const apiKey = elements.apiKey.value.trim();
    
    // Validate inputs
    if (!userId) {
        showStatus('Please enter your Brewfather User ID', 'error');
        elements.userId.focus();
        return;
    }
    
    if (!apiKey) {
        showStatus('Please enter your Brewfather API Key', 'error');
        elements.apiKey.focus();
        return;
    }
    
    // Show saving state
    const originalText = elements.saveBtn.textContent;
    elements.saveBtn.textContent = '💾 Saving...';
    elements.saveBtn.disabled = true;
    
    try {
        // Save to storage
        await chrome.storage.sync.set({
            theme: theme,
            language: language,
            brewfatherUserId: userId,
            brewfatherApiKey: apiKey
        });
        
        showStatus('Settings saved successfully! 🎉', 'success');
        updateTestButtonState();
        
        // Test connection automatically after saving
        setTimeout(() => {
            if (!elements.testBtn.disabled) {
                testConnection();
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Failed to save settings. Please try again.', 'error');
    } finally {
        elements.saveBtn.textContent = originalText;
        elements.saveBtn.disabled = false;
    }
}

// Test API connection
async function testConnection() {
    const userId = elements.userId.value.trim();
    const apiKey = elements.apiKey.value.trim();
    
    if (!userId || !apiKey) {
        showStatus('Please enter both User ID and API Key before testing', 'error');
        return;
    }
    
    // Show testing state
    const originalText = elements.testBtn.textContent;
    elements.testBtn.textContent = '🧪 Testing...';
    elements.testBtn.disabled = true;
    
    try {
        // Test connection by making a simple API call
        const response = await fetch('https://api.brewfather.app/v2/recipes?limit=1', {
            headers: {
                'Authorization': 'Basic ' + btoa(`${userId}:${apiKey}`),
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showStatus('✅ Connection successful! Your credentials are working correctly.', 'success');
        } else if (response.status === 401) {
            showStatus('❌ Authentication failed. Please check your User ID and API Key.', 'error');
        } else if (response.status === 403) {
            showStatus('❌ Access denied. Make sure your API key has "Read Recipes" scope enabled.', 'error');
        } else if (response.status === 429) {
            showStatus('⚠️ Rate limit exceeded. Your credentials are correct but you\'ve made too many requests. Try again later.', 'info');
        } else {
            showStatus(`❌ Connection failed with status ${response.status}. Please try again.`, 'error');
        }
        
    } catch (error) {
        console.error('Error testing connection:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showStatus('❌ Network error. Please check your internet connection and try again.', 'error');
        } else {
            showStatus('❌ Connection test failed. Please check your credentials and try again.', 'error');
        }
    } finally {
        elements.testBtn.textContent = originalText;
        updateTestButtonState();
    }
}

// Show status message
function showStatus(message, type = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message status-${type}`;
    elements.statusMessage.style.display = 'block';
    
    // Auto-hide success and info messages after 5 seconds
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            elements.statusMessage.style.display = 'none';
        }, 5000);
    }
}

// Add helpful validation feedback
elements.userId.addEventListener('blur', () => {
    const value = elements.userId.value.trim();
    if (value && !isValidUserId(value)) {
        showStatus('User ID format looks unusual. Make sure you copied it correctly from Brewfather.', 'info');
    }
});

elements.apiKey.addEventListener('blur', () => {
    const value = elements.apiKey.value.trim();
    if (value && !isValidApiKey(value)) {
        showStatus('API Key format looks unusual. Make sure you copied the full key from Brewfather.', 'info');
    }
});

// Basic validation helpers
function isValidUserId(userId) {
    // Basic check - User IDs are typically alphanumeric strings
    return /^[a-zA-Z0-9]+$/.test(userId) && userId.length > 5;
}

function isValidApiKey(apiKey) {
    // Basic check - API keys are typically longer alphanumeric strings
    return /^[a-zA-Z0-9]+$/.test(apiKey) && apiKey.length > 20;
}

// Theme handling functions
async function handleThemeChange() {
    const theme = elements.themeSelect.value;
    
    try {
        // Save theme preference immediately
        await chrome.storage.sync.set({ theme: theme });
        applyTheme();
        
        showStatus('Theme preference saved!', 'success');
    } catch (error) {
        console.error('Error saving theme preference:', error);
        showStatus('Failed to save theme preference', 'error');
    }
}

function applyTheme() {
    const theme = elements.themeSelect.value;
    
    // Remove existing theme attributes
    document.documentElement.removeAttribute('data-theme');
    
    if (theme !== 'system') {
        // Apply user-selected theme
        document.documentElement.setAttribute('data-theme', theme);
    }
    // If 'system', let CSS media query handle it
}

// Listen for system theme changes when using system preference
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener((e) => {
        // Only respond to system changes if user has selected 'system'
        if (elements.themeSelect.value === 'system') {
            applyTheme();
        }
    });
}
