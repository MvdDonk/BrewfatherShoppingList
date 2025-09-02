// Popup script for managing shopping list display and interactions

// Detect if running in standalone window or popup
const isStandalone = document.body.dataset.context === 'standalone' || 
                    (window.location.href.includes('standalone.html'));

document.addEventListener('DOMContentLoaded', async () => {
    await initializePopup();
});

// DOM elements
const elements = {
    // Views
    mainMenu: document.getElementById('mainMenu'),
    shoppingListView: document.getElementById('shoppingListView'),
    substitutionsView: document.getElementById('substitutionsView'),
    loading: document.getElementById('loadingIndicator'),
    emptyState: document.getElementById('emptyState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    content: document.getElementById('shoppingListContent'),
    configAlert: document.getElementById('configAlert'),
    itemCount: document.getElementById('itemCount'),
    ingredientsList: document.getElementById('ingredientsList'),
    exportModal: document.getElementById('exportModal'),
    
    // Substitutions elements
    substitutionsContent: document.getElementById('substitutionsContent'),
    substitutionsLoadingIndicator: document.getElementById('substitutionsLoadingIndicator'),
    substitutionsEmptyState: document.getElementById('substitutionsEmptyState'),
    substitutionsList: document.getElementById('substitutionsList'),
    applySubstitutionsBtn: document.getElementById('applySubstitutionsBtn'),
    substitutionsCount: document.getElementById('substitutionsCount'),
    substitutionsBadge: document.getElementById('substitutionsBadge'),
    
    // Menu buttons
    addToListBtn: document.getElementById('addToListBtn'),
    showShoppingListBtn: document.getElementById('showShoppingListBtn'),
    showSubstitutionsBtn: document.getElementById('showSubstitutionsBtn'),
    settingsMenuBtn: document.getElementById('settingsMenuBtn'),
    backToMenuBtn: document.getElementById('backToMenuBtn'),
    backToMenuFromSubstitutionsBtn: document.getElementById('backToMenuFromSubstitutionsBtn'),
    substitutionsHeaderBtn: document.getElementById('substitutionsHeaderBtn'),
    
    // Action buttons
    retryBtn: document.getElementById('retryBtn'),
    clearBtn: document.getElementById('clearBtn'),
    exportBtn: document.getElementById('exportBtn'),
    popOutBtn: document.getElementById('popOutBtn'),
    closeExportModal: document.getElementById('closeExportModal'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    exportTxt: document.getElementById('exportTxt'),
    exportCsv: document.getElementById('exportCsv'),
    exportPdf: document.getElementById('exportPdf')
};

// Initialize popup
async function initializePopup() {
    // Apply theme first
    await applyTheme();
    
    // Set up storage listeners for automatic updates
    setupStorageListeners();
    
    // Check if credentials are configured
    const hasCredentials = await checkCredentials();
    
    if (!hasCredentials) {
        showConfigAlert();
        // Setup event listeners
        setupEventListeners();
        // Update button states even when showing config alert
        await updateMenuButtonStates();
        return;
    }
    
    // In standalone mode, go directly to shopping list
    if (isStandalone) {
        setupEventListeners();
        showShoppingListView();
        return;
    }
    
    // Check if we should show shopping list directly (after adding an item)
    const result = await chrome.storage.local.get(['showShoppingListOnOpen']);
    if (result.showShoppingListOnOpen) {
        // Clear the flag and show shopping list
        await chrome.storage.local.remove(['showShoppingListOnOpen']);
        showShoppingListView();
    } else {
        // Show main menu initially
        showMainMenu();
    }
    
    // Setup event listeners
    setupEventListeners();
}

// Setup storage listeners for automatic updates
function setupStorageListeners() {
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            // Handle shopping list changes
            if (changes.shoppingList) {
                handleShoppingListUpdate(changes.shoppingList.newValue || []);
            }
            
            // Handle substitutions changes
            if (changes.ingredientSubstitutions) {
                handleSubstitutionsUpdate(changes.ingredientSubstitutions.newValue || []);
            }
        }
        
        if (namespace === 'sync') {
            // Handle theme changes
            if (changes.theme) {
                applyTheme();
            }
        }
    });
}

// Handle shopping list updates from storage
async function handleShoppingListUpdate(newShoppingList) {
    // Only update if we're currently showing the shopping list view
    if (elements.shoppingListView.style.display !== 'none') {
        // Get fresh substitutions data
        const response = await chrome.runtime.sendMessage({ action: 'getSubstitutions' });
        const substitutions = response.success ? response.data : [];
        
        // Update the display
        displayShoppingList(newShoppingList, substitutions);
    }
    
    // Update substitution counts in all views
    const response = await chrome.runtime.sendMessage({ action: 'getSubstitutions' });
    const substitutions = response.success ? response.data : [];
    updateSubstitutionCounts(substitutions);
}

// Handle substitutions updates from storage
function handleSubstitutionsUpdate(newSubstitutions) {
    // Update substitution counts
    updateSubstitutionCounts(newSubstitutions);
    
    // If we're in the substitutions view, refresh it
    if (elements.substitutionsView.style.display !== 'none') {
        displaySubstitutionsInView(newSubstitutions);
    }
}

// Check if credentials are configured
async function checkCredentials() {
    try {
        const result = await chrome.storage.sync.get(['brewfatherUserId', 'brewfatherApiKey']);
        return !!(result.brewfatherUserId && result.brewfatherApiKey);
    } catch (error) {
        console.error('Error checking credentials:', error);
        return false;
    }
}

// Show configuration alert
function showConfigAlert() {
    hideAllViews();
    elements.configAlert.style.display = 'flex';
}

// Show main menu
function showMainMenu() {
    hideAllViews();
    elements.mainMenu.style.display = 'flex';
    updateMenuButtonStates();
}

// Show shopping list view
function showShoppingListView() {
    hideAllViews();
    elements.shoppingListView.style.display = 'flex';
    loadShoppingList();
}

// Show substitutions view
function showSubstitutionsView() {
    hideAllViews();
    elements.substitutionsView.style.display = 'flex';
    loadSubstitutions();
}

// Hide all views
function hideAllViews() {
    elements.mainMenu.style.display = 'none';
    elements.shoppingListView.style.display = 'none';
    elements.substitutionsView.style.display = 'none';
    elements.configAlert.style.display = 'none';
}

// Update menu button states based on current context
async function updateMenuButtonStates() {
    // In standalone mode, disable "Add to Shopping List" as we can't access the current tab
    if (isStandalone) {
        if (elements.addToListBtn) {
            elements.addToListBtn.classList.add('disabled');
            const descriptionElement = elements.addToListBtn.querySelector('.menu-text p');
            if (descriptionElement) {
                descriptionElement.textContent = 'Use the browser extension popup to add recipes (not available in this window)';
            }
        }
        return;
    }
    
    // Check if we're on a recipe page (only in normal popup mode)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isOnRecipePage = tab?.url && tab.url.includes('web.brewfather.app/tabs/recipes/recipe/');
    
    const descriptionElement = elements.addToListBtn.querySelector('.menu-text p');
    
    // Enable/disable "Add to Shopping List" button
    if (isOnRecipePage) {
        elements.addToListBtn.classList.remove('disabled');
        descriptionElement.textContent = 'Add current recipe to your shopping list';
    } else {
        elements.addToListBtn.classList.add('disabled');
        descriptionElement.textContent = 'Navigate to a recipe page first';
    }
}

// Hide all state displays (for shopping list view)
function hideAllStates() {
    elements.loading.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.content.style.display = 'none';
}

// Load shopping list
async function loadShoppingList() {
    try {
        showLoading();
        
        // Load both shopping list and substitutions
        const [shoppingResponse, substitutionsResponse] = await Promise.all([
            chrome.runtime.sendMessage({ action: 'getShoppingList' }),
            chrome.runtime.sendMessage({ action: 'getSubstitutions' })
        ]);
        
        if (shoppingResponse.success) {
            const substitutions = substitutionsResponse.success ? substitutionsResponse.data : [];
            displayShoppingList(shoppingResponse.data, substitutions);
        } else {
            showError(shoppingResponse.error || 'Failed to load shopping list');
        }
    } catch (error) {
        console.error('Error loading shopping list:', error);
        showError('Failed to load shopping list');
    }
}

// Show loading state
function showLoading() {
    hideAllStates();
    elements.loading.style.display = 'block';
}

// Show error state
function showError(message) {
    hideAllStates();
    elements.errorMessage.textContent = message;
    elements.errorState.style.display = 'block';
}

// Display shopping list
function displayShoppingList(ingredients, substitutions = []) {
    hideAllStates();
    
    if (!ingredients || ingredients.length === 0) {
        elements.emptyState.style.display = 'block';
        return;
    }
    
    // Update item count
    elements.itemCount.textContent = `${ingredients.length} item${ingredients.length !== 1 ? 's' : ''}`;
    
    // Update substitution counts but don't display them inline
    updateSubstitutionCounts(substitutions);
    
    // Clear and populate ingredients list
    elements.ingredientsList.innerHTML = '';
    
    // Group ingredients by type
    const groupedIngredients = groupIngredientsByType(ingredients);
    
    // Render each group
    Object.entries(groupedIngredients).forEach(([type, items]) => {
        if (items.length > 0) {
            const groupHeader = createGroupHeader(type);
            elements.ingredientsList.appendChild(groupHeader);
            
            items.forEach(ingredient => {
                const item = createIngredientItem(ingredient);
                elements.ingredientsList.appendChild(item);
            });
        }
    });
    
    elements.content.style.display = 'block';
}

// Update substitution counts and button visibility
function updateSubstitutionCounts(substitutions) {
    const count = substitutions ? substitutions.length : 0;
    
    // Update menu item count
    if (elements.substitutionsCount) {
        elements.substitutionsCount.textContent = count;
    }
    
    // Update header badge
    if (elements.substitutionsBadge) {
        elements.substitutionsBadge.textContent = count;
    }
    
    // Show/hide buttons based on substitution availability
    const hasSubstitutions = count > 0;
    
    if (elements.showSubstitutionsBtn) {
        elements.showSubstitutionsBtn.style.display = hasSubstitutions ? 'flex' : 'none';
    }
    
    if (elements.substitutionsHeaderBtn) {
        elements.substitutionsHeaderBtn.style.display = hasSubstitutions ? 'block' : 'none';
    }
}

// Load substitutions view
async function loadSubstitutions() {
    try {
        // Show loading state
        elements.substitutionsLoadingIndicator.style.display = 'block';
        elements.substitutionsContent.style.display = 'none';
        elements.substitutionsEmptyState.style.display = 'none';
        
        // Get substitutions from background script
        const response = await chrome.runtime.sendMessage({ action: 'getSubstitutions' });
        
        if (response.success) {
            const substitutions = response.data || [];
            
            // Hide loading
            elements.substitutionsLoadingIndicator.style.display = 'none';
            
            if (substitutions.length === 0) {
                // Show empty state
                elements.substitutionsEmptyState.style.display = 'block';
            } else {
                // Display substitutions
                displaySubstitutionsInView(substitutions);
                elements.substitutionsContent.style.display = 'block';
            }
        } else {
            throw new Error(response.error || 'Failed to load substitutions');
        }
    } catch (error) {
        console.error('Error loading substitutions:', error);
        elements.substitutionsLoadingIndicator.style.display = 'none';
        elements.substitutionsEmptyState.style.display = 'block';
        
        // Update empty state to show error
        const emptyIcon = elements.substitutionsEmptyState.querySelector('.empty-icon');
        const emptyTitle = elements.substitutionsEmptyState.querySelector('h3');
        const emptyText = elements.substitutionsEmptyState.querySelector('p');
        
        if (emptyIcon) emptyIcon.textContent = '⚠️';
        if (emptyTitle) emptyTitle.textContent = 'Error loading substitutions';
        if (emptyText) emptyText.textContent = 'Please try again later.';
    }
}

// Display substitutions in the dedicated view
function displaySubstitutionsInView(substitutions) {
    elements.substitutionsList.innerHTML = '';
    
    substitutions.forEach(substitution => {
        const substitutionItem = createSubstitutionItem(substitution);
        elements.substitutionsList.appendChild(substitutionItem);
    });
    
    // Show apply button if there are substitutions
    elements.applySubstitutionsBtn.style.display = substitutions.length > 0 ? 'block' : 'none';
    
    // Add event listener for apply all button
    elements.applySubstitutionsBtn.onclick = applyAllSelectedSubstitutions;
}

// Apply all selected substitutions
async function applyAllSelectedSubstitutions() {
    try {
        const substitutions = [];
        const substitutionItems = elements.substitutionsList.querySelectorAll('.substitution-item');
        
        substitutionItems.forEach(item => {
            const substitutionId = item.dataset.substitutionId;
            const selectedRadio = item.querySelector(`input[name="substitution_${substitutionId}"]:checked`);
            
            if (selectedRadio && substitutionId) {
                substitutions.push({
                    substitutionId: substitutionId,
                    chosenIngredientId: selectedRadio.value
                });
            }
        });
        
        if (substitutions.length === 0) {
            alert('Please select ingredients for substitution.');
            return;
        }
        
        // Disable button during processing
        elements.applySubstitutionsBtn.disabled = true;
        elements.applySubstitutionsBtn.textContent = 'Applying...';
        
        // Apply all substitutions
        const response = await chrome.runtime.sendMessage({
            action: 'applyMultipleSubstitutions',
            substitutions: substitutions
        });
        
        if (response.success) {
            // Go back to shopping list to show updated results
            showShoppingListView();
        } else {
            throw new Error(response.error || 'Failed to apply substitutions');
        }
    } catch (error) {
        console.error('Error applying substitutions:', error);
        alert('Failed to apply substitutions. Please try again.');
    } finally {
        // Re-enable button
        elements.applySubstitutionsBtn.disabled = false;
        elements.applySubstitutionsBtn.textContent = 'Apply Selected Substitutions';
    }
}

// Display substitution suggestions
function displaySubstitutions(substitutions) {
    const substitutionsList = document.getElementById('substitutionsList');
    substitutionsList.innerHTML = '';
    
    substitutions.forEach(substitution => {
        const substitutionItem = createSubstitutionItem(substitution);
        substitutionsList.appendChild(substitutionItem);
    });
}

// Create substitution item element
function createSubstitutionItem(substitution) {
    const item = document.createElement('div');
    item.className = 'substitution-item';
    item.dataset.substitutionId = substitution.id;
    
    const categoryName = substitution.category || 'Unknown Category';
    const totalAmount = formatAmount(substitution.totalAmount, substitution.unit);
    
    item.innerHTML = `
        <div class="substitution-category">${categoryName}</div>
        <div class="substitution-total">Total needed: ${totalAmount}</div>
        <div class="substitution-options" data-substitution-id="${substitution.id}">
            ${substitution.ingredients.map((ingredient, index) => `
                <label class="substitution-option" data-ingredient-id="${ingredient.id}">
                    <input type="radio" name="substitution_${substitution.id}" value="${ingredient.id}" class="substitution-radio" ${index === 0 ? 'checked' : ''}>
                    <div class="substitution-ingredient">
                        <div class="substitution-ingredient-name">${escapeHtml(ingredient.name)}</div>
                        <div class="substitution-ingredient-details">
                            ${formatAmount(ingredient.amount, ingredient.unit)} • 
                            Color: ${ingredient.color} • 
                            ${ingredient.origin || 'Unknown origin'}
                            ${ingredient.recipeNames ? `<br>From: ${ingredient.recipeNames.join(', ')}` : ''}
                        </div>
                    </div>
                </label>
            `).join('')}
        </div>
    `;
    
    // Add click handlers for radio button labels
    const options = item.querySelectorAll('.substitution-option');
    options.forEach(option => {
        option.addEventListener('click', (e) => {
            if (e.target.type !== 'radio') {
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;
            }
        });
    });
    
    return item;
}

// Apply substitution
async function applySubstitution(substitutionId, chosenIngredientId) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'applySubstitution',
            substitutionId: substitutionId,
            chosenIngredientId: chosenIngredientId
        });
        
        if (response.success) {
            // Reload the shopping list with updated data
            displayShoppingList(response.data.shoppingList, response.data.substitutions);
        } else {
            console.error('Error applying substitution:', response.error);
            // Show user-friendly error message
            alert('Failed to apply substitution. Please try again.');
        }
    } catch (error) {
        console.error('Error applying substitution:', error);
        alert('Failed to apply substitution. Please try again.');
    }
}

// Dismiss substitution (remove from suggestions)
window.dismissSubstitution = async function(substitutionId) {
    try {
        // Get current substitutions
        const response = await chrome.runtime.sendMessage({ action: 'getSubstitutions' });
        if (response.success) {
            const updatedSubstitutions = response.data.filter(sub => sub.id !== substitutionId);
            
            // Save updated substitutions (without the dismissed one)
            await chrome.storage.local.set({ ingredientSubstitutions: updatedSubstitutions });
            
            // Reload substitutions display
            displaySubstitutions(updatedSubstitutions);
            
            // Hide section if no more substitutions
            if (updatedSubstitutions.length === 0) {
                document.getElementById('substitutionsSection').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error dismissing substitution:', error);
    }
}

// Group ingredients by type
function groupIngredientsByType(ingredients) {
    return ingredients.reduce((groups, ingredient) => {
        const type = ingredient.type || 'other';
        if (!groups[type]) {
            groups[type] = [];
        }
        groups[type].push(ingredient);
        return groups;
    }, {});
}

// Create group header
function createGroupHeader(type) {
    const header = document.createElement('div');
    header.className = 'group-header';
    header.innerHTML = `
        <h4>${getTypeDisplayName(type)}</h4>
    `;
    header.style.cssText = `
        padding: 12px 20px 8px;
        background: #f8f9fa;
        font-size: 12px;
        font-weight: 600;
        color: #495057;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #dee2e6;
    `;
    return header;
}

// Get display name for ingredient type
function getTypeDisplayName(type) {
    const typeNames = {
        fermentable: '🌾 Fermentables',
        hop: '🌿 Hops',
        yeast: '🦠 Yeasts',
        other: '📦 Other'
    };
    return typeNames[type] || '📦 Other';
}

// Create ingredient item element
function createIngredientItem(ingredient) {
    const item = document.createElement('div');
    item.className = 'ingredient-item';
    
    const amount = formatAmount(ingredient.amount, ingredient.unit);
    const details = getIngredientDetails(ingredient);
    const recipes = getRecipeInfo(ingredient);
    
    item.innerHTML = `
        <div class="ingredient-info">
            <div class="ingredient-name">${escapeHtml(ingredient.name)}</div>
            ${details ? `<div class="ingredient-details">${details}</div>` : ''}
            <div class="ingredient-amount">${amount}</div>
            ${recipes ? `<div class="ingredient-recipes">${recipes}</div>` : ''}
        </div>
        <div class="ingredient-actions">
            <button class="btn btn-icon remove-btn" data-id="${ingredient.id}" title="Remove">🗑️</button>
        </div>
    `;
    
    return item;
}

// Format amount with proper units and precision
function formatAmount(amount, unit) {
    if (typeof amount !== 'number') return `${amount} ${unit}`;
    
    // Round to reasonable precision
    let roundedAmount;
    if (amount >= 1) {
        roundedAmount = Math.round(amount * 100) / 100; // 2 decimal places
    } else {
        roundedAmount = Math.round(amount * 1000) / 1000; // 3 decimal places
    }
    
    return `${roundedAmount} ${unit}`;
}

// Get ingredient details string
function getIngredientDetails(ingredient) {
    const details = [];
    
    if (ingredient.origin) {
        details.push(ingredient.origin);
    }
    
    if (ingredient.supplier) {
        details.push(ingredient.supplier);
    }
    
    if (ingredient.laboratory) {
        details.push(ingredient.laboratory);
    }
    
    if (ingredient.alpha) {
        details.push(`${ingredient.alpha}% AA`);
    }
    
    if (ingredient.color && ingredient.type === 'fermentable') {
        details.push(`${ingredient.color} EBC`);
    }
    
    if (ingredient.hopType) {
        details.push(ingredient.hopType);
    }
    
    if (ingredient.yeastType) {
        details.push(ingredient.yeastType);
    }
    
    if (ingredient.form) {
        details.push(ingredient.form);
    }
    
    return details.join(' • ');
}

// Get recipe info string
function getRecipeInfo(ingredient) {
    if (ingredient.recipeNames && ingredient.recipeNames.length > 0) {
        if (ingredient.recipeNames.length === 1) {
            return `From: ${ingredient.recipeNames[0]}`;
        } else {
            return `From: ${ingredient.recipeNames.join(', ')}`;
        }
    }
    return '';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup event listeners
function setupEventListeners() {
    // Only add Escape key as courtesy - browser handles auto-close natively
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            window.close();
        }
    });
    
    // Menu navigation
    elements.addToListBtn.addEventListener('click', async () => {
        if (!elements.addToListBtn.classList.contains('disabled')) {
            await addCurrentRecipeToShoppingList();
        }
    });
    
    elements.showShoppingListBtn.addEventListener('click', () => {
        showShoppingListView();
    });
    
    elements.showSubstitutionsBtn.addEventListener('click', () => {
        showSubstitutionsView();
    });
    
    elements.settingsMenuBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    elements.backToMenuBtn.addEventListener('click', () => {
        showMainMenu();
    });
    
    elements.backToMenuFromSubstitutionsBtn.addEventListener('click', () => {
        showMainMenu();
    });
    
    elements.substitutionsHeaderBtn.addEventListener('click', () => {
        showSubstitutionsView();
    });
    
    // Pop out button
    elements.popOutBtn.addEventListener('click', () => {
        popOutToNewWindow();
    });
    
    // Retry button
    elements.retryBtn.addEventListener('click', loadShoppingList);
    
    // Clear all button
    elements.clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all items from your shopping list?')) {
            clearShoppingList();
        }
    });
    
    // Export button
    elements.exportBtn.addEventListener('click', () => {
        elements.exportModal.style.display = 'flex';
    });
    
    // Close export modal
    elements.closeExportModal.addEventListener('click', () => {
        elements.exportModal.style.display = 'none';
    });
    
    // Open settings from config alert
    elements.openSettingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    // Export options
    elements.exportTxt.addEventListener('click', () => exportShoppingList('txt'));
    elements.exportCsv.addEventListener('click', () => exportShoppingList('csv'));
    elements.exportPdf.addEventListener('click', () => exportShoppingList('pdf'));
    
    // Remove ingredient buttons (event delegation)
    elements.ingredientsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) {
            const ingredientId = e.target.getAttribute('data-id');
            removeIngredient(ingredientId);
        }
    });
    
    // Close modal when clicking outside
    elements.exportModal.addEventListener('click', (e) => {
        if (e.target === elements.exportModal) {
            elements.exportModal.style.display = 'none';
        }
    });
    
    // Update button states when window gains focus (in case user switched tabs)
    window.addEventListener('focus', async () => {
        // Only update if we're showing the main menu
        if (elements.mainMenu.style.display !== 'none') {
            await updateMenuButtonStates();
        }
    });
}

// Pop out shopping list to new window
async function popOutToNewWindow() {
    try {
        // Create a new window with the standalone HTML
        const standaloneUrl = chrome.runtime.getURL('standalone.html');
        
        // Create new window with appropriate size
        const newWindow = window.open(
            standaloneUrl, 
            'brewfather-shopping-list', 
            'width=800,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no'
        );
        
        if (newWindow) {
            newWindow.focus();
        } else {
            alert('Pop-up blocked. Please allow pop-ups for this extension.');
        }
    } catch (error) {
        console.error('Error creating pop-out window:', error);
        alert('Failed to create new window');
    }
}

async function addCurrentRecipeToShoppingList() {
    try {
        // In standalone mode, we can't access the current tab
        if (isStandalone) {
            alert('Please use the extension popup to add recipes from recipe pages.');
            return;
        }
        
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab?.url || !tab.url.includes('web.brewfather.app/tabs/recipes/recipe/')) {
            alert('Please navigate to a Brewfather recipe page first');
            return;
        }
        
        // Extract recipe ID from URL
        const urlPattern = /\/tabs\/recipes\/recipe\/([^\/]+)/;
        const match = tab.url.match(urlPattern);
        
        if (!match) {
            alert('Could not detect recipe ID from current page');
            return;
        }
        
        const recipeId = match[1];
        
        // Show loading state in menu
        const originalText = elements.addToListBtn.querySelector('.menu-text h3').textContent;
        elements.addToListBtn.querySelector('.menu-text h3').textContent = 'Adding to list...';
        elements.addToListBtn.classList.add('disabled');
        
        try {
            // Send message to background script to fetch recipe
            const response = await chrome.runtime.sendMessage({
                action: 'addRecipeToShoppingList',
                recipeId: recipeId
            });
            
            if (response.success) {
                // Show success and then navigate to shopping list
                elements.addToListBtn.querySelector('.menu-text h3').textContent = '✅ Added!';
                setTimeout(() => {
                    showShoppingListView();
                }, 1000);
            } else {
                throw new Error(response.error || 'Failed to add recipe');
            }
        } catch (error) {
            console.error('Error adding recipe to shopping list:', error);
            alert('Error: ' + error.message);
            elements.addToListBtn.querySelector('.menu-text h3').textContent = originalText;
            elements.addToListBtn.classList.remove('disabled');
        }
    } catch (error) {
        console.error('Error getting current tab:', error);
        alert('Could not access current tab');
    }
}
async function clearShoppingList() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'clearShoppingList'
        });
        
        if (response.success) {
            // Clear substitutions as well since shopping list is empty
            await chrome.runtime.sendMessage({
                action: 'clearSubstitutions'
            });
            
            // Reload shopping list to show empty state
            await loadShoppingList();
            
            // Update substitution counts (should be 0 now)
            updateSubstitutionCounts([]);
        } else {
            alert('Failed to clear shopping list: ' + response.error);
        }
    } catch (error) {
        console.error('Error clearing shopping list:', error);
        alert('Failed to clear shopping list');
    }
}

// Remove single ingredient
async function removeIngredient(ingredientId) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'removeFromShoppingList',
            ingredientId: ingredientId
        });
        
        if (response.success) {
            // Update substitutions after removing ingredient
            const substitutionsResponse = await chrome.runtime.sendMessage({ action: 'updateSubstitutions' });
            const substitutions = substitutionsResponse.success ? substitutionsResponse.data : [];
            
            // Update the display with fresh data
            displayShoppingList(response.data, substitutions);
            
            // Update substitution counts
            updateSubstitutionCounts(substitutions);
        } else {
            alert('Failed to remove ingredient: ' + response.error);
        }
    } catch (error) {
        console.error('Error removing ingredient:', error);
        alert('Failed to remove ingredient');
    }
}

// Export shopping list
async function exportShoppingList(format) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getShoppingList'
        });
        
        if (!response.success) {
            alert('Failed to get shopping list for export');
            return;
        }
        
        const ingredients = response.data;
        let content = '';
        let filename = `brewfather-shopping-list-${new Date().toISOString().split('T')[0]}`;
        
        switch (format) {
            case 'txt':
                content = exportToText(ingredients);
                filename += '.txt';
                break;
            case 'csv':
                content = exportToCSV(ingredients);
                filename += '.csv';
                break;
            case 'pdf':
                exportToPDF(ingredients);
                elements.exportModal.style.display = 'none';
                return;
        }
        
        // Download file
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        elements.exportModal.style.display = 'none';
    } catch (error) {
        console.error('Error exporting shopping list:', error);
        alert('Failed to export shopping list');
    }
}

// Export to text format
function exportToText(ingredients) {
    let content = 'BREWFATHER SHOPPING LIST\n';
    content += '========================\n';
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    const grouped = groupIngredientsByType(ingredients);
    
    Object.entries(grouped).forEach(([type, items]) => {
        if (items.length > 0) {
            content += `${getTypeDisplayName(type).replace(/🌾|🌿|🦠|📦/g, '').trim().toUpperCase()}\n`;
            content += '-'.repeat(20) + '\n';
            
            items.forEach(ingredient => {
                const amount = formatAmount(ingredient.amount, ingredient.unit);
                content += `• ${ingredient.name} - ${amount}\n`;
                
                const details = getIngredientDetails(ingredient);
                if (details) {
                    content += `  ${details}\n`;
                }
                
                const recipes = getRecipeInfo(ingredient);
                if (recipes) {
                    content += `  ${recipes}\n`;
                }
                content += '\n';
            });
        }
    });
    
    return content;
}

// Export to CSV format
function exportToCSV(ingredients) {
    let content = 'Name,Amount,Unit,Type,Details,Recipes\n';
    
    ingredients.forEach(ingredient => {
        const name = escapeCSV(ingredient.name);
        const amount = ingredient.amount;
        const unit = escapeCSV(ingredient.unit);
        const type = escapeCSV(ingredient.type);
        const details = escapeCSV(getIngredientDetails(ingredient));
        const recipes = escapeCSV(getRecipeInfo(ingredient));
        
        content += `${name},${amount},${unit},${type},${details},${recipes}\n`;
    });
    
    return content;
}

// Escape CSV field
function escapeCSV(field) {
    if (typeof field !== 'string') return '';
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
}

// Export to PDF (using browser's print functionality)
function exportToPDF(ingredients) {
    const printWindow = window.open('', '_blank');
    const content = generatePrintContent(ingredients);
    
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
}

// Generate HTML content for printing
function generatePrintContent(ingredients) {
    const grouped = groupIngredientsByType(ingredients);
    
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Brewfather Shopping List</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #f39c12; border-bottom: 2px solid #f39c12; }
                h2 { color: #333; margin-top: 30px; }
                .ingredient { margin: 10px 0; padding: 10px; border-left: 3px solid #f39c12; }
                .amount { font-weight: bold; color: #e67e22; }
                .details { font-size: 0.9em; color: #666; }
                .recipes { font-size: 0.8em; color: #999; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <h1>🍺 Brewfather Shopping List</h1>
            <p>Generated: ${new Date().toLocaleDateString()}</p>
    `;
    
    Object.entries(grouped).forEach(([type, items]) => {
        if (items.length > 0) {
            html += `<h2>${getTypeDisplayName(type)}</h2>`;
            
            items.forEach(ingredient => {
                const amount = formatAmount(ingredient.amount, ingredient.unit);
                const details = getIngredientDetails(ingredient);
                const recipes = getRecipeInfo(ingredient);
                
                html += `
                    <div class="ingredient">
                        <div class="name">${escapeHtml(ingredient.name)} - <span class="amount">${amount}</span></div>
                        ${details ? `<div class="details">${escapeHtml(details)}</div>` : ''}
                        ${recipes ? `<div class="recipes">${escapeHtml(recipes)}</div>` : ''}
                    </div>
                `;
            });
        }
    });
    
    html += '</body></html>';
    return html;
}

// Theme handling functions
async function applyTheme() {
    try {
        const result = await chrome.storage.sync.get(['theme']);
        const theme = result.theme || 'system'; // Default to system preference
        
        // Remove existing theme attributes
        document.documentElement.removeAttribute('data-theme');
        
        if (theme !== 'system') {
            // Apply user-selected theme
            document.documentElement.setAttribute('data-theme', theme);
        }
        // If 'system', let CSS media query handle it
    } catch (error) {
        console.error('Error applying theme:', error);
        // Fallback to system preference if error
    }
}

// Listen for system theme changes when using system preference
if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addListener(async (e) => {
        try {
            const result = await chrome.storage.sync.get(['theme']);
            const theme = result.theme || 'system';
            
            // Only respond to system changes if user has selected 'system'
            if (theme === 'system') {
                await applyTheme();
            }
        } catch (error) {
            console.error('Error handling system theme change:', error);
        }
    });
}
