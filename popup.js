// Popup script for managing shopping list display and interactions

document.addEventListener('DOMContentLoaded', async () => {
    await initializePopup();
});

// DOM elements
const elements = {
    loading: document.getElementById('loadingIndicator'),
    emptyState: document.getElementById('emptyState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    content: document.getElementById('shoppingListContent'),
    configAlert: document.getElementById('configAlert'),
    itemCount: document.getElementById('itemCount'),
    ingredientsList: document.getElementById('ingredientsList'),
    exportModal: document.getElementById('exportModal'),
    
    // Buttons
    refreshBtn: document.getElementById('refreshBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    retryBtn: document.getElementById('retryBtn'),
    clearBtn: document.getElementById('clearBtn'),
    exportBtn: document.getElementById('exportBtn'),
    closeExportModal: document.getElementById('closeExportModal'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    exportTxt: document.getElementById('exportTxt'),
    exportCsv: document.getElementById('exportCsv'),
    exportPdf: document.getElementById('exportPdf')
};

// Initialize popup
async function initializePopup() {
    // Check if credentials are configured
    const hasCredentials = await checkCredentials();
    
    if (!hasCredentials) {
        showConfigAlert();
            // Setup event listeners
    }
    else {
        // Load shopping list
        await loadShoppingList();
    }   
     
    // Setup event listeners
    setupEventListeners();
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
    hideAllStates();
    elements.configAlert.style.display = 'flex';
}

// Hide all state displays
function hideAllStates() {
    elements.loading.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.content.style.display = 'none';
    elements.configAlert.style.display = 'none';
}

// Load shopping list
async function loadShoppingList() {
    try {
        showLoading();
        
        const response = await chrome.runtime.sendMessage({
            action: 'getShoppingList'
        });
        
        if (response.success) {
            displayShoppingList(response.data);
        } else {
            showError(response.error || 'Failed to load shopping list');
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
function displayShoppingList(ingredients) {
    hideAllStates();
    
    if (!ingredients || ingredients.length === 0) {
        elements.emptyState.style.display = 'block';
        return;
    }
    
    // Update item count
    elements.itemCount.textContent = `${ingredients.length} item${ingredients.length !== 1 ? 's' : ''}`;
    
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
        const recipeText = ingredient.recipeNames.length === 1 
            ? ingredient.recipeNames[0]
            : `${ingredient.recipeNames.length} recipes`;
        return `From: ${recipeText}`;
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
    // Refresh button
    elements.refreshBtn.addEventListener('click', loadShoppingList);
    
    // Settings button
    elements.settingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
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
}

// Clear shopping list
async function clearShoppingList() {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'clearShoppingList'
        });
        
        if (response.success) {
            await loadShoppingList();
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
            displayShoppingList(response.data);
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
