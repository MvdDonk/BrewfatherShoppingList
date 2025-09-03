// Popup script for managing shopping list display and interactions

// Detect if running in standalone window or popup
const isStandalone = document.body.dataset.context === 'standalone' || 
                    (window.location.href.includes('standalone.html'));

// Color conversion functions
function convertColor(srm, targetUnit) {
    if (!srm || isNaN(srm)) return srm;
    
    const srmValue = parseFloat(srm);
    
    switch (targetUnit) {
        case 'SRM':
            return srmValue.toFixed(1);
        case 'EBC':
            return (srmValue * 1.97).toFixed(1);
        case 'Lovibond':
            return ((srmValue + 0.76) / 1.3546).toFixed(1);
        default:
            return (srmValue * 1.97).toFixed(1); // Default to EBC
    }
}

function getColorUnitSymbol(unit) {
    switch (unit) {
        case 'SRM':
            return 'SRM';
        case 'EBC':
            return 'EBC';
        case 'Lovibond':
            return '°L';
        default:
            return 'EBC'; // Default to EBC
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize translations first
    await i18n.init();
    
    // Then initialize the popup
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
    
    // Update UI with translations
    updateUITranslations();
    
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
            
            // Handle language changes
            if (changes.language) {
                i18n.setLanguage(changes.language.newValue).then(() => {
                    updateUITranslations();
                });
            }
        }
    });
}

// Update UI with current translations
function updateUITranslations() {
    try {
        // Update page title
        document.title = i18n.t('appName');
        
        // Update header
        const header = document.querySelector('.popup-header h1');
        if (header) {
            header.textContent = `🍺 ${i18n.t('appName')}`;
        }
        
        // Update menu items
        updateMenuItemText('addToListBtn', 'menu.addToList', 'menu.addToListDescription');
        updateMenuItemText('showShoppingListBtn', 'menu.viewShoppingList', 'menu.viewShoppingListDescription');
        updateMenuItemText('showSubstitutionsBtn', 'menu.viewSubstitutions', 'menu.viewSubstitutionsDescription');
        updateMenuItemText('settingsMenuBtn', 'menu.settings', 'menu.settingsDescription');
        
        // Update shopping list view
        updateTextContent('backToMenuBtn .btn-text', 'shoppingList.backToMenu');
        updateTextContent('#shoppingListView .view-header h2', 'shoppingList.title');
        updateTextContent('#emptyState h3', 'shoppingList.empty');
        updateTextContent('#emptyState p', 'shoppingList.emptyDescription');
        updateTextContent('#loadingIndicator p', 'shoppingList.loading');
        updateTextContent('#errorState h3', 'shoppingList.error');
        updateTextContent('#retryBtn .btn-text', 'shoppingList.retry');
        updateTextContent('#clearBtn .btn-text', 'shoppingList.clear');
        updateTextContent('#exportBtn .btn-text', 'shoppingList.export');
        updateTextContent('#popOutBtn .btn-text', 'shoppingList.popOut');
        
        // Update substitutions view
        updateTextContent('#backToMenuFromSubstitutionsBtn .btn-text', 'substitutions.backToMenu');
        updateTextContent('#substitutionsView .view-header h2', 'substitutions.title');
        updateTextContent('#substitutionsView .view-subtitle', 'substitutions.subtitle');
        updateTextContent('#substitutionsEmptyState h3', 'substitutions.empty');
        updateTextContent('#substitutionsEmptyState p', 'substitutions.emptyDescription');
        updateTextContent('#substitutionsLoadingIndicator p', 'substitutions.loading');
        updateTextContent('#applySubstitutionsBtn', 'substitutions.applySelected');
        
        // Update export modal
        updateTextContent('#exportModal h2', 'export.title');
        updateTextContent('#exportTxt .btn-text', 'export.text');
        updateTextContent('#exportCsv .btn-text', 'export.csv');
        updateTextContent('#exportPdf .btn-text', 'export.pdf');
        updateTextContent('#closeExportModal .btn-text', 'export.close');
        
        // Update config alert
        updateTextContent('#configAlert h2', 'config.title');
        updateTextContent('#configAlert p', 'config.description');
        updateTextContent('#openSettingsBtn .btn-text', 'config.openSettings');
        
    } catch (error) {
        console.error('Error updating UI translations:', error);
    }
}

// Helper function to update menu item text
function updateMenuItemText(buttonId, titleKey, descriptionKey) {
    const button = document.getElementById(buttonId);
    if (button) {
        const titleElement = button.querySelector('.menu-text h3');
        const descriptionElement = button.querySelector('.menu-text p');
        
        if (titleElement) {
            titleElement.textContent = i18n.t(titleKey);
        }
        if (descriptionElement) {
            descriptionElement.textContent = i18n.t(descriptionKey);
        }
    }
}

// Helper function to update text content
function updateTextContent(selector, translationKey) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = i18n.t(translationKey);
    }
}

// Handle shopping list updates from storage
async function handleShoppingListUpdate(newShoppingList) {
    // Only update if we're currently showing the shopping list view
    if (elements.shoppingListView.style.display !== 'none') {
        // Get fresh substitutions data
        const response = await chrome.runtime.sendMessage({ action: 'getSubstitutions' });
        const substitutions = response.success ? response.data : [];
        
        // Update the display
        await displayShoppingList(newShoppingList, substitutions);
    }
    
    // Update substitution counts in all views
    const response = await chrome.runtime.sendMessage({ action: 'getSubstitutions' });
    const substitutions = response.success ? response.data : [];
    updateSubstitutionCounts(substitutions);
}

// Handle substitutions updates from storage
async function handleSubstitutionsUpdate(newSubstitutions) {
    // Update substitution counts
    updateSubstitutionCounts(newSubstitutions);
    
    // If we're in the substitutions view, refresh it
    if (elements.substitutionsView.style.display !== 'none') {
        await displaySubstitutionsInView(newSubstitutions);
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
                descriptionElement.textContent = i18n.t('menu.addToListStandalone');
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
        descriptionElement.textContent = i18n.t('menu.addToListDescription');
    } else {
        elements.addToListBtn.classList.add('disabled');
        descriptionElement.textContent = i18n.t('menu.addToListDisabled');
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
            await displayShoppingList(shoppingResponse.data, substitutions);
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
async function displayShoppingList(ingredients, substitutions = []) {
    hideAllStates();
    
    if (!ingredients || ingredients.length === 0) {
        elements.emptyState.style.display = 'block';
        return;
    }
    
    // Update item count
    elements.itemCount.textContent = i18n.t('shoppingList.itemCount', { count: ingredients.length });
    
    // Update substitution counts but don't display them inline
    updateSubstitutionCounts(substitutions);
    
    // Clear and populate ingredients list
    elements.ingredientsList.innerHTML = '';
    
    // Group ingredients by type
    const groupedIngredients = groupIngredientsByType(ingredients);
    
    // Define group order (fermentables, hops, yeasts, other)
    const groupOrder = ['fermentable', 'hop', 'yeast', 'other'];
    
    // Render each group in order
    for (const type of groupOrder) {
        const items = groupedIngredients[type];
        if (items && items.length > 0) {
            // Sort items alphabetically by name
            const sortedItems = items.sort((a, b) => 
                (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
            );
            
            const groupHeader = createGroupHeader(type);
            elements.ingredientsList.appendChild(groupHeader);
            
            for (const ingredient of sortedItems) {
                const item = await createIngredientItem(ingredient);
                elements.ingredientsList.appendChild(item);
            }
        }
    }
    
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
                await displaySubstitutionsInView(substitutions);
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
async function displaySubstitutionsInView(substitutions) {
    elements.substitutionsList.innerHTML = '';
    
    for (const substitution of substitutions) {
        const substitutionItem = await createSubstitutionItem(substitution);
        elements.substitutionsList.appendChild(substitutionItem);
    }
    
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
            alert(i18n.t('messages.selectSubstitutions'));
            return;
        }
        
        // Disable button during processing
        elements.applySubstitutionsBtn.disabled = true;
        elements.applySubstitutionsBtn.textContent = i18n.t('substitutions.applying');
        
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
        alert(i18n.t('messages.failedSubstitutions'));
    } finally {
        // Re-enable button
        elements.applySubstitutionsBtn.disabled = false;
        elements.applySubstitutionsBtn.textContent = i18n.t('substitutions.applySelected');
    }
}

// Display substitution suggestions
async function displaySubstitutions(substitutions) {
    const substitutionsList = document.getElementById('substitutionsList');
    substitutionsList.innerHTML = '';
    
    for (const substitution of substitutions) {
        const substitutionItem = await createSubstitutionItem(substitution);
        substitutionsList.appendChild(substitutionItem);
    }
}

// Helper function to get substitution advice from database
async function getSubstitutionAdvice(ingredient) {
    try {
        const response = await fetch(chrome.runtime.getURL('malt-substitution-database.json'));
        const database = await response.json();
        
        if (!database || ingredient.type !== 'fermentable') {
            return null;
        }
        
        const grainName = ingredient.name.toLowerCase();
        const grainColor = ingredient.color || 0;
        const grainCategory = ingredient.grainCategory || '';
        
        // Get manufacturer equivalents
        const manufacturerEquivs = findManufacturerEquivalentsInDB(ingredient.name, database);
        
        // Get technical brewing data
        const technicalData = getTechnicalBrewingData(grainColor, grainCategory, database);
        
        let substitutionInfo = null;
        
        // Check if it's a crystal/caramel malt
        if (grainCategory.toLowerCase().includes('crystal') || grainCategory.toLowerCase().includes('caramel') ||
            grainName.includes('crystal') || grainName.includes('caramel') || grainName.includes('cara')) {
            
            const crystalData = database.maltSubstitutions.crystalCaramel['Crystal/Caramel'];
            if (crystalData && crystalData.substitutions) {
                // Find the best matching range
                const matchingRange = crystalData.substitutions.find(sub => 
                    grainColor >= sub.colorRange.min && grainColor <= sub.colorRange.max
                );
                
                if (matchingRange) {
                    substitutionInfo = {
                        flavorImpact: matchingRange.flavorImpact || matchingRange.notes,
                        usage: matchingRange.usage || "Standard 1:1 replacement",
                        notes: matchingRange.notes
                    };
                }
            }
        }
        
        // Check base malts
        if (!substitutionInfo) {
            for (const [categoryKey, categoryData] of Object.entries(database.maltSubstitutions.baseMalts)) {
                if ((categoryKey.includes('Pilsner') && (grainName.includes('pilsner') || grainName.includes('lager'))) ||
                    (categoryKey.includes('Munich') && grainName.includes('munich')) ||
                    (categoryKey.includes('Vienna') && grainName.includes('vienna'))) {
                    
                    const matchingSubstitution = categoryData.substitutions.find(sub => 
                        grainColor >= sub.colorRange.min && grainColor <= sub.colorRange.max
                    );
                    
                    if (matchingSubstitution) {
                        substitutionInfo = {
                            flavorImpact: matchingSubstitution.flavorImpact || matchingSubstitution.notes,
                            usage: matchingSubstitution.usage || "Standard 1:1 replacement", 
                            notes: matchingSubstitution.notes
                        };
                        break;
                    }
                }
            }
        }
        
        // Check specialty malts
        if (!substitutionInfo) {
            for (const [categoryKey, categoryData] of Object.entries(database.maltSubstitutions.specialtyMalts)) {
                if ((categoryKey === 'Chocolate' && grainName.includes('chocolate')) ||
                    (categoryKey === 'Victory' && grainName.includes('victory'))) {
                    
                    const matchingSubstitution = categoryData.substitutions.find(sub => 
                        grainColor >= sub.colorRange.min && grainColor <= sub.colorRange.max
                    );
                    
                    if (matchingSubstitution) {
                        substitutionInfo = {
                            flavorImpact: matchingSubstitution.flavorImpact || matchingSubstitution.notes,
                            usage: matchingSubstitution.usage || "Standard 1:1 replacement",
                            notes: matchingSubstitution.notes
                        };
                        break;
                    }
                }
            }
        }
        
        // Combine all information
        return {
            ...substitutionInfo,
            manufacturerEquivalents: manufacturerEquivs,
            technicalData: technicalData
        };
        
    } catch (error) {
        console.warn('Could not load substitution advice:', error);
        return null;
    }
}

// Helper function to find manufacturer equivalents
function findManufacturerEquivalentsInDB(grainName, database) {
    if (!database.manufacturerEquivalents) return [];
    
    const equivalents = [];
    const grainNameLower = grainName.toLowerCase();
    
    for (const [manufacturer, products] of Object.entries(database.manufacturerEquivalents)) {
        for (const [productName, alternatives] of Object.entries(products)) {
            // Check if the grain matches this product
            if (grainNameLower.includes(productName.toLowerCase()) || 
                productName.toLowerCase().includes(grainNameLower.split(' ')[0])) {
                alternatives.slice(0, 3).forEach(alt => { // Limit to 3 alternatives
                    equivalents.push({
                        manufacturer: manufacturer,
                        alternative: alt
                    });
                });
            }
        }
    }
    
    return equivalents.slice(0, 5); // Limit total to 5 equivalents
}

// Helper function to get technical brewing data
function getTechnicalBrewingData(grainColor, grainCategory, database) {
    if (!database.technicalData) return null;
    
    const technical = database.technicalData;
    
    // Determine diastatic power category
    let diastaticPower = 'low';
    if (grainCategory.toLowerCase().includes('base') || 
        grainCategory.toLowerCase().includes('pilsner') ||
        grainCategory.toLowerCase().includes('pale')) {
        diastaticPower = 'high';
    } else if (grainCategory.toLowerCase().includes('munich') ||
               grainCategory.toLowerCase().includes('vienna')) {
        diastaticPower = 'medium';
    } else if (grainColor > 200) {
        diastaticPower = 'none';
    }
    
    // Determine max batch percentage
    let maxBatch = '5-15%';
    if (grainCategory.toLowerCase().includes('base')) {
        maxBatch = '80-100%';
    } else if (grainColor > 500) {
        maxBatch = '1-3%';
    } else if (grainColor > 200) {
        maxBatch = '1-5%';
    } else if (grainColor > 100) {
        maxBatch = '2-10%';
    }
    
    return {
        diastaticPower: technical.diastaticPower.ranges[diastaticPower] || technical.diastaticPower.ranges.low,
        maxBatchPercentage: maxBatch
    };
}

// Helper function to format color for display
async function formatColorForDisplay(color, type) {
    if (!color || type !== 'fermentable') {
        return '';
    }
    
    // Get user's preferred color unit
    const settings = await chrome.storage.sync.get(['colorUnit']);
    const colorUnit = settings.colorUnit || 'EBC';
    const convertedColor = convertColor(color, colorUnit);
    const unitSymbol = getColorUnitSymbol(colorUnit);
    
    return `${i18n.t('common.color')}: ${convertedColor} ${unitSymbol}`;
}

// Create substitution item element
async function createSubstitutionItem(substitution) {
    const item = document.createElement('div');
    item.className = 'substitution-item';
    item.dataset.substitutionId = substitution.id;
    
    const categoryName = substitution.category || 'Unknown Category';
    const totalAmount = formatAmount(substitution.totalAmount, substitution.unit);
    
    // Process ingredients with async color conversion and substitution advice
    const ingredientOptions = [];
    for (let index = 0; index < substitution.ingredients.length; index++) {
        const ingredient = substitution.ingredients[index];
        const colorDisplay = await formatColorForDisplay(ingredient.color, ingredient.type);
        const substitutionAdvice = await getSubstitutionAdvice(ingredient);
        
        // Build advice display
        let adviceDisplay = '';
        if (substitutionAdvice) {
            let adviceContent = '';
            
            // Basic flavor and usage advice
            if (substitutionAdvice.flavorImpact) {
                adviceContent += `<div class="flavor-impact"><strong>Flavor:</strong> ${substitutionAdvice.flavorImpact}</div>`;
            }
            if (substitutionAdvice.usage) {
                adviceContent += `<div class="usage-advice"><strong>Usage:</strong> ${substitutionAdvice.usage}</div>`;
            }
            
            // Technical brewing data
            if (substitutionAdvice.technicalData) {
                adviceContent += `<div class="technical-data">
                    <strong>Technical:</strong> Max ${substitutionAdvice.technicalData.maxBatchPercentage}, ${substitutionAdvice.technicalData.diastaticPower}
                </div>`;
            }
            
            // Manufacturer equivalents
            if (substitutionAdvice.manufacturerEquivalents && substitutionAdvice.manufacturerEquivalents.length > 0) {
                const equivalents = substitutionAdvice.manufacturerEquivalents
                    .slice(0, 3) // Limit to 3 to avoid clutter
                    .map(eq => `${eq.manufacturer}: ${eq.alternative}`)
                    .join(', ');
                adviceContent += `<div class="manufacturer-equivalents">
                    <strong>Equivalents:</strong> ${equivalents}
                </div>`;
            }
            
            if (adviceContent) {
                adviceDisplay = `<div class="substitution-advice">${adviceContent}</div>`;
            }
        }
        
        ingredientOptions.push(`
            <label class="substitution-option" data-ingredient-id="${ingredient.id}">
                <input type="radio" name="substitution_${substitution.id}" value="${ingredient.id}" class="substitution-radio" ${index === 0 ? 'checked' : ''}>
                <div class="substitution-ingredient">
                    <div class="substitution-ingredient-name">${escapeHtml(ingredient.name)}</div>
                    <div class="substitution-ingredient-details">
                        ${formatAmount(ingredient.amount, ingredient.unit)}${colorDisplay ? ` • ${colorDisplay}` : ''} • 
                        ${ingredient.origin || i18n.t('common.origin')}
                        ${ingredient.recipeNames ? `<br>${i18n.t('substitutions.from', { recipes: ingredient.recipeNames.join(', ') })}` : ''}
                    </div>
                    ${adviceDisplay}
                </div>
            </label>
        `);
    }
    
    item.innerHTML = `
        <div class="substitution-category">${categoryName}</div>
        <div class="substitution-total">${i18n.t('substitutions.totalNeeded', { amount: totalAmount })}</div>
        <div class="substitution-options" data-substitution-id="${substitution.id}">
            ${ingredientOptions.join('')}
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
            await displayShoppingList(response.data.shoppingList, response.data.substitutions);
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
            await displaySubstitutions(updatedSubstitutions);
            
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
    return i18n.t(`ingredientTypes.${type}`) || i18n.t('ingredientTypes.other');
}

// Create ingredient item element
async function createIngredientItem(ingredient) {
    const item = document.createElement('div');
    item.className = 'ingredient-item';
    
    const amount = formatAmount(ingredient.amount, ingredient.unit);
    const details = await getIngredientDetails(ingredient);
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
async function getIngredientDetails(ingredient) {
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
        // Get user's preferred color unit
        const settings = await chrome.storage.sync.get(['colorUnit']);
        const colorUnit = settings.colorUnit || 'EBC';
        const convertedColor = convertColor(ingredient.color, colorUnit);
        const unitSymbol = getColorUnitSymbol(colorUnit);
        details.push(`${convertedColor} ${unitSymbol}`);
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
        if (confirm(i18n.t('shoppingList.clearConfirm'))) {
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
            alert(i18n.t('messages.popupBlocked'));
        }
    } catch (error) {
        console.error('Error creating pop-out window:', error);
        alert(i18n.t('messages.failedPopout'));
    }
}

async function addCurrentRecipeToShoppingList() {
    try {
        // In standalone mode, we can't access the current tab
        if (isStandalone) {
            alert(i18n.t('messages.usePopup'));
            return;
        }
        
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab?.url || !tab.url.includes('web.brewfather.app/tabs/recipes/recipe/')) {
            alert(i18n.t('messages.navigateToRecipe'));
            return;
        }
        
        // Extract recipe ID from URL
        const urlPattern = /\/tabs\/recipes\/recipe\/([^\/]+)/;
        const match = tab.url.match(urlPattern);
        
        if (!match) {
            alert(i18n.t('messages.noRecipeId'));
            return;
        }
        
        const recipeId = match[1];
        
        // Show loading state in menu
        const originalText = elements.addToListBtn.querySelector('.menu-text h3').textContent;
        elements.addToListBtn.querySelector('.menu-text h3').textContent = i18n.t('messages.adding');
        elements.addToListBtn.classList.add('disabled');
        
        try {
            // Send message to background script to fetch recipe
            const response = await chrome.runtime.sendMessage({
                action: 'addRecipeToShoppingList',
                recipeId: recipeId
            });
            
            if (response.success) {
                // Show success and then navigate to shopping list
                elements.addToListBtn.querySelector('.menu-text h3').textContent = i18n.t('messages.added');
                setTimeout(() => {
                    showShoppingListView();
                }, 1000);
            } else {
                throw new Error(response.error || i18n.t('messages.failed'));
            }
        } catch (error) {
            console.error('Error adding recipe to shopping list:', error);
            alert('Error: ' + error.message);
            elements.addToListBtn.querySelector('.menu-text h3').textContent = originalText;
            elements.addToListBtn.classList.remove('disabled');
        }
    } catch (error) {
        console.error('Error getting current tab:', error);
        alert(i18n.t('messages.accessTabError'));
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
            await displayShoppingList(response.data, substitutions);
            
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
        const dateStr = new Date().toISOString().split('T')[0];
        let filename = i18n.t('export.filename', { date: dateStr });
        
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
    let content = i18n.t('appName').toUpperCase() + '\n';
    content += '========================\n';
    content += i18n.t('common.generated', { date: new Date().toLocaleDateString() }) + '\n\n';
    
    const grouped = groupIngredientsByType(ingredients);
    
    // Define group order (fermentables, hops, yeasts, other)
    const groupOrder = ['fermentable', 'hop', 'yeast', 'other'];
    
    groupOrder.forEach(type => {
        const items = grouped[type];
        if (items && items.length > 0) {
            // Sort items alphabetically by name
            const sortedItems = items.sort((a, b) => 
                (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
            );
            
            content += `${getTypeDisplayName(type).replace(/🌾|🌿|🦠|📦/g, '').trim().toUpperCase()}\n`;
            content += '-'.repeat(20) + '\n';
            
            sortedItems.forEach(ingredient => {
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
    
    const grouped = groupIngredientsByType(ingredients);
    
    // Define group order (fermentables, hops, yeasts, other)
    const groupOrder = ['fermentable', 'hop', 'yeast', 'other'];
    
    groupOrder.forEach(type => {
        const items = grouped[type];
        if (items && items.length > 0) {
            // Sort items alphabetically by name
            const sortedItems = items.sort((a, b) => 
                (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
            );
            
            sortedItems.forEach(ingredient => {
                const name = escapeCSV(ingredient.name);
                const amount = ingredient.amount;
                const unit = escapeCSV(ingredient.unit);
                const type = escapeCSV(ingredient.type);
                const details = escapeCSV(getIngredientDetails(ingredient));
                const recipes = escapeCSV(getRecipeInfo(ingredient));
                
                content += `${name},${amount},${unit},${type},${details},${recipes}\n`;
            });
        }
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
            <h1>🍺 ${i18n.t('appName')}</h1>
            <p>${i18n.t('common.generated', { date: new Date().toLocaleDateString() })}</p>
    `;
    
    // Define group order (fermentables, hops, yeasts, other)
    const groupOrder = ['fermentable', 'hop', 'yeast', 'other'];
    
    groupOrder.forEach(type => {
        const items = grouped[type];
        if (items && items.length > 0) {
            // Sort items alphabetically by name
            const sortedItems = items.sort((a, b) => 
                (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
            );
            
            html += `<h2>${getTypeDisplayName(type)}</h2>`;
            
            sortedItems.forEach(ingredient => {
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
