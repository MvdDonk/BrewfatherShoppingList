// Content script for detecting recipe pages and injecting the "Add to Shopping List" button

(function() {
    'use strict';

    // Extract recipe ID from URL
    function getRecipeId() {
        const urlPattern = /\/tabs\/recipes\/recipe\/([^\/]+)/;
        const match = window.location.pathname.match(urlPattern);
        return match ? match[1] : null;
    }

    // Create the shopping list button
    function createShoppingListButton(uniqueId = 'brewfather-shopping-list-btn') {
        const button = document.createElement('button');
        button.id = uniqueId;
        button.innerHTML = '&#43;'; // HTML entity for plus sign
        button.className = 'brewfather-shopping-btn';
        
        button.addEventListener('click', async () => {
            const recipeId = getRecipeId();
            if (!recipeId) {
                alert('Could not detect recipe ID');
                return;
            }

            // Show loading state
            const originalText = button.textContent;
            button.textContent = '⏳ Adding to list...';
            button.disabled = true;

            try {
                // Send message to background script to fetch recipe
                const response = await chrome.runtime.sendMessage({
                    action: 'addRecipeToShoppingList',
                    recipeId: recipeId
                });

                if (response.success) {
                    button.textContent = '✅ Added to list!';
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.disabled = false;
                        
                        // Show shopping list popup
                        chrome.runtime.sendMessage({
                            action: 'showShoppingList'
                        });
                    }, 2000);
                } else {
                    throw new Error(response.error || 'Failed to add recipe');
                }
            } catch (error) {
                console.error('Error adding recipe to shopping list:', error);
                alert('Error: ' + error.message);
                button.textContent = originalText;
                button.disabled = false;
            }
        });

        return button;
    }

    // Helper function to check if an element is visible (enhanced for Shadow DOM)
    function isElementVisible(element) {
        if (!element) return false;
        
        // Check if element or any parent has display: none or visibility: hidden
        let current = element;
        while (current && current !== document.body) {
            const style = window.getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden') {
                return false;
            }
            current = current.parentElement;
        }
        
        // Check if element has any size (width and height > 0)
        const rect = element.getBoundingClientRect();
        const hasSize = rect.width > 0 && rect.height > 0;
        
        // Additional check for Shadow DOM: ensure element is actually in viewport or at least positioned
        const isPositioned = rect.top !== 0 || rect.left !== 0 || hasSize;
        
        // For ion-title elements, also check if they contain any text or child elements
        const hasContent = element.textContent.trim().length > 0 || element.children.length > 0;
        
        console.log(`Visibility check for ion-title: hasSize=${hasSize}, isPositioned=${isPositioned}, hasContent=${hasContent}`);
        
        return hasSize && isPositioned && hasContent;
    }

    // Find a good place to inject the button
    function injectButton() {
        console.log('Attempting to inject button...');
        
        // Look for all ion-title elements and find visible ones
        const titleElements = document.querySelectorAll('ion-title');
        let injectedCount = 0;
        
        if (titleElements.length > 0) {
            console.log(`Found ${titleElements.length} ion-title element(s), checking visibility...`);
            
            for (let i = 0; i < titleElements.length; i++) {
                const titleElement = titleElements[i];
                if (isElementVisible(titleElement)) {
                    // Check if button already exists in this title element
                    const existingButton = titleElement.querySelector('.brewfather-shopping-btn');
                    if (!existingButton) {
                        console.log('Found visible ion-title element, injecting button');
                        const uniqueId = titleElements.length === 1 ? 
                            'brewfather-shopping-list-btn' : 
                            `brewfather-shopping-list-btn-${i}`;
                        const button = createShoppingListButton(uniqueId);
                        
                        // Insert the button as the first child of ion-title
                        titleElement.insertBefore(button, titleElement.firstChild);
                        console.log('Button successfully injected into visible ion-title');
                        injectedCount++;
                    } else {
                        console.log('Button already exists in this visible ion-title element');
                        injectedCount++;
                    }
                } else {
                    console.log('Found ion-title element but it is hidden, skipping...');
                }
            }
            
            if (injectedCount > 0) {
                return true;
            } else {
                console.log('No visible ion-title elements found, trying fallback selectors');
            }
        } else {
            console.log('No ion-title elements found, trying fallback selectors');
        }
        
        // Fallback to other selectors if ion-title not found
        const fallbackSelectors = [
            '.recipe-header',
            '.recipe-title', 
            '[data-cy="recipe-header"]',
            'h1',
            '.page-header',
            '.recipe-info',
            'ion-header', // Add ion-header as fallback
            'ion-toolbar' // Add ion-toolbar as fallback
        ];

        let targetElement = null;
        for (const selector of fallbackSelectors) {
            targetElement = document.querySelector(selector);
            if (targetElement) {
                console.log(`Found fallback element: ${selector}`);
                break;
            }
        }

        // If no specific header found, try to find any container
        if (!targetElement) {
            console.log('No header elements found, trying main containers');
            targetElement = document.querySelector('main') || 
                           document.querySelector('.content') || 
                           document.querySelector('#app') ||
                           document.querySelector('body'); // Last resort
        }

        if (targetElement) {
            console.log(`Injecting button into: ${targetElement.tagName.toLowerCase()}`);
            const button = createShoppingListButton();
            
            // For ion-header or ion-toolbar, try to append to it directly
            if (targetElement.tagName.toLowerCase() === 'ion-header' || 
                targetElement.tagName.toLowerCase() === 'ion-toolbar') {
                targetElement.appendChild(button);
            } else {
                // Try to insert after the target element, or as first child
                if (targetElement.nextSibling) {
                    targetElement.parentNode.insertBefore(button, targetElement.nextSibling);
                } else {
                    targetElement.appendChild(button);
                }
            }
            
            console.log('Button successfully injected into fallback element');
            return true;
        }
        
        console.log('Failed to find any suitable element for button injection');
        return false;
    }

    // Wait for Shadow DOM elements to be rendered using MutationObserver
    function waitForShadowDOMElements(callback, timeout = 15000) {
        console.log('Setting up MutationObserver to wait for Shadow DOM elements...');
        
        let observer;
        let timeoutId;
        let isResolved = false;
        
        function resolve() {
            if (isResolved) return;
            isResolved = true;
            
            if (observer) {
                observer.disconnect();
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            callback();
        }
        
        // Check if Ionic app is loaded and elements are already available
        const ionApp = document.querySelector('ion-app');
        const titleElements = document.querySelectorAll('ion-title');
        
        if (ionApp && titleElements.length > 0) {
            // Wait a bit more to ensure Shadow DOM is fully rendered and hydrated
            setTimeout(() => {
                console.log('Ionic app and ion-title elements found immediately, checking after short delay...');
                resolve();
            }, 800);
            return;
        }
        
        // Set up MutationObserver to watch for DOM changes
        observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            
            for (const mutation of mutations) {
                // Check if any ion-title elements were added
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'ION-TITLE' || 
                                node.tagName === 'ION-APP' ||
                                (node.querySelector && (node.querySelector('ion-title') || node.querySelector('ion-app')))) {
                                shouldCheck = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldCheck) break;
            }
            
            if (shouldCheck) {
                console.log('Detected relevant Ionic elements in DOM changes, waiting for Shadow DOM to settle...');
                // Wait a bit for Shadow DOM to fully render and hydrate
                setTimeout(() => {
                    const app = document.querySelector('ion-app');
                    const elements = document.querySelectorAll('ion-title');
                    if (app && elements.length > 0) {
                        console.log(`Found ion-app and ${elements.length} ion-title element(s) after DOM change`);
                        resolve();
                    }
                }, 500);
            }
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Set timeout as fallback
        timeoutId = setTimeout(() => {
            console.log('Timeout reached waiting for Shadow DOM elements');
            resolve();
        }, timeout);
    }

    // Wait for page to load and inject button
    function init() {
        console.log('Initializing content script, checking recipe ID...');
        
        // Check if we're on a recipe page
        const recipeId = getRecipeId();
        if (!recipeId) {
            console.log('Not on a recipe page, removing any existing buttons');
            // Remove any existing buttons by class
            const existingButtons = document.querySelectorAll('.brewfather-shopping-btn');
            existingButtons.forEach(button => button.remove());
            return;
        }

        console.log(`On recipe page with ID: ${recipeId}`);

        // Remove any existing buttons by class
        const existingButtons = document.querySelectorAll('.brewfather-shopping-btn');
        if (existingButtons.length > 0) {
            console.log(`Removing ${existingButtons.length} existing button(s)`);
            existingButtons.forEach(button => button.remove());
        }

        // Wait for Shadow DOM to be ready, then inject button
        waitForShadowDOMElements(() => {
            console.log('Shadow DOM elements should be ready, attempting injection...');
            
            // Try injection with a few retry attempts
            let attempts = 0;
            const maxAttempts = 5;
            
            function tryInject() {
                attempts++;
                console.log(`Injection attempt ${attempts}/${maxAttempts}`);
                
                if (injectButton()) {
                    console.log('Button injection successful!');
                    return;
                }
                
                if (attempts < maxAttempts) {
                    console.log(`Injection failed, retrying in 500ms...`);
                    setTimeout(tryInject, 500);
                } else {
                    console.error('Failed to inject button after maximum attempts');
                    // Last resort: try to inject into body
                    const button = createShoppingListButton();
                    button.style.position = 'fixed';
                    button.style.top = '10px';
                    button.style.right = '10px';
                    button.style.zIndex = '10000';
                    document.body.appendChild(button);
                    console.log('Button injected as fixed overlay as last resort');
                }
            }
            
            tryInject();
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Listen for URL change messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'urlChanged') {
            // Longer delay to allow Shadow DOM to fully render after URL change
            console.log('URL changed, waiting for Shadow DOM to settle...');
            setTimeout(init, 1000);
        }
    });
})();
