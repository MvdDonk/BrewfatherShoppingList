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
    function createShoppingListButton() {
        const button = document.createElement('button');
        button.id = 'brewfather-shopping-list-btn';
        button.textContent = '🛒 Add to Shopping List';
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

    // Find a good place to inject the button
    function injectButton() {
        // Look for recipe header or title area
        const selectors = [
            'body',
            '.recipe-header',
            '.recipe-title',
            '[data-cy="recipe-header"]',
            'h1',
            '.page-header',
            '.recipe-info'
        ];

        let targetElement = null;
        for (const selector of selectors) {
            targetElement = document.querySelector(selector);
            if (targetElement) break;
        }

        // If no specific header found, try to find any container
        if (!targetElement) {
            targetElement = document.querySelector('main') || 
                           document.querySelector('.content') || 
                           document.querySelector('#app');
        }

        if (targetElement) {
            const button = createShoppingListButton();
            
            // Try to insert after the target element, or as first child
            if (targetElement.nextSibling) {
                targetElement.parentNode.insertBefore(button, targetElement.nextSibling);
            } else {
                targetElement.appendChild(button);
            }
            
            return true;
        }
        return false;
    }

    // Wait for page to load and inject button
    function init() {
        // Remove any existing button
        const existingButton = document.getElementById('brewfather-shopping-list-btn');
        if (existingButton) {
            existingButton.remove();
        }

        // Check if we're on a recipe page
        if (!getRecipeId()) {
            return;
        }

        // Try to inject button, retry if page not ready
        if (!injectButton()) {
            setTimeout(init, 1000);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-inject button if URL changes (SPA navigation)
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            setTimeout(init, 500); // Small delay for SPA to update
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
