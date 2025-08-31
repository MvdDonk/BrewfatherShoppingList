// Background script for handling API calls and data management

// Storage keys
const STORAGE_KEYS = {
    USER_ID: 'brewfatherUserId',
    API_KEY: 'brewfatherApiKey',
    SHOPPING_LIST: 'shoppingList'
};

// Helper function to get stored credentials
async function getCredentials() {
    const result = await chrome.storage.sync.get([STORAGE_KEYS.USER_ID, STORAGE_KEYS.API_KEY]);
    return {
        userId: result[STORAGE_KEYS.USER_ID],
        apiKey: result[STORAGE_KEYS.API_KEY]
    };
}

// Helper function to create Basic Auth header
function createAuthHeader(userId, apiKey) {
    const credentials = `${userId}:${apiKey}`;
    return 'Basic ' + btoa(credentials);
}

// Fetch recipe from Brewfather API
async function fetchRecipe(recipeId) {
    const { userId, apiKey } = await getCredentials();
    
    if (!userId || !apiKey) {
        throw new Error('Please configure your Brewfather User ID and API Key in the extension options');
    }

    const response = await fetch(`https://api.brewfather.app/v2/recipes/${recipeId}`, {
        headers: {
            'Authorization': createAuthHeader(userId, apiKey),
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid Brewfather credentials. Please check your User ID and API Key');
        } else if (response.status === 404) {
            throw new Error('Recipe not found');
        } else if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later');
        } else {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
    }

    return await response.json();
}

// Extract ingredients from recipe
function extractIngredients(recipe) {
    const ingredients = [];

    // Extract fermentables
    if (recipe.fermentables && Array.isArray(recipe.fermentables)) {
        recipe.fermentables.forEach(fermentable => {
            ingredients.push({
                id: fermentable._id,
                name: fermentable.name,
                amount: fermentable.amount,
                unit: 'kg',
                type: 'fermentable',
                origin: fermentable.origin,
                supplier: fermentable.supplier,
                recipeId: recipe._id,
                recipeName: recipe.name
            });
        });
    }

    // Extract hops (aggregate same hop used multiple times)
    if (recipe.hops && Array.isArray(recipe.hops)) {
        const hopMap = new Map();
        
        recipe.hops.forEach(hop => {
            const key = hop._id;
            if (hopMap.has(key)) {
                hopMap.get(key).amount += hop.amount;
            } else {
                hopMap.set(key, {
                    id: hop._id,
                    name: hop.name,
                    amount: hop.amount,
                    unit: 'g',
                    type: 'hop',
                    alpha: hop.alpha,
                    hopType: hop.type,
                    origin: hop.origin,
                    recipeId: recipe._id,
                    recipeName: recipe.name
                });
            }
        });

        hopMap.forEach(hop => ingredients.push(hop));
    }

    // Extract yeasts
    if (recipe.yeasts && Array.isArray(recipe.yeasts)) {
        recipe.yeasts.forEach(yeast => {
            ingredients.push({
                id: yeast._id,
                name: yeast.name,
                amount: yeast.amount,
                unit: yeast.unit || 'pkg',
                type: 'yeast',
                laboratory: yeast.laboratory,
                yeastType: yeast.type,
                form: yeast.form,
                recipeId: recipe._id,
                recipeName: recipe.name
            });
        });
    }

    return ingredients;
}

// Get current shopping list
async function getShoppingList() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.SHOPPING_LIST]);
    return result[STORAGE_KEYS.SHOPPING_LIST] || [];
}

// Save shopping list
async function saveShoppingList(shoppingList) {
    await chrome.storage.local.set({
        [STORAGE_KEYS.SHOPPING_LIST]: shoppingList
    });
}

// Add ingredients to shopping list
async function addToShoppingList(newIngredients) {
    const currentList = await getShoppingList();
    const updatedList = [...currentList];

    newIngredients.forEach(newIngredient => {
        // Find existing ingredient by ID
        const existingIndex = updatedList.findIndex(item => item.id === newIngredient.id);
        
        if (existingIndex >= 0) {
            // Add to existing ingredient
            updatedList[existingIndex].amount += newIngredient.amount;
            
            // Add recipe info if not already present
            if (!updatedList[existingIndex].recipeIds) {
                updatedList[existingIndex].recipeIds = [updatedList[existingIndex].recipeId];
                updatedList[existingIndex].recipeNames = [updatedList[existingIndex].recipeName];
            }
            
            if (!updatedList[existingIndex].recipeIds.includes(newIngredient.recipeId)) {
                updatedList[existingIndex].recipeIds.push(newIngredient.recipeId);
                updatedList[existingIndex].recipeNames.push(newIngredient.recipeName);
            }
        } else {
            // Add new ingredient
            updatedList.push({
                ...newIngredient,
                recipeIds: [newIngredient.recipeId],
                recipeNames: [newIngredient.recipeName]
            });
        }
    });

    await saveShoppingList(updatedList);
    return updatedList;
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'addRecipeToShoppingList') {
        handleAddRecipeToShoppingList(message.recipeId)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep message channel open for async response
    }
    
    if (message.action === 'showShoppingList') {
        // Open the extension popup programmatically
        chrome.action.openPopup().catch(() => {
            // If popup fails to open, we can't do much
            console.log('Could not open popup automatically');
        });
        sendResponse({ success: true });
        return true;
    }
    
    if (message.action === 'getShoppingList') {
        getShoppingList()
            .then(list => sendResponse({ success: true, data: list }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'clearShoppingList') {
        saveShoppingList([])
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'removeFromShoppingList') {
        removeFromShoppingList(message.ingredientId)
            .then(list => sendResponse({ success: true, data: list }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

// Handle adding recipe to shopping list
async function handleAddRecipeToShoppingList(recipeId) {
    try {
        const recipe = await fetchRecipe(recipeId);
        const ingredients = extractIngredients(recipe);
        const updatedList = await addToShoppingList(ingredients);
        
        // Set flag to show shopping list when popup opens
        await chrome.storage.local.set({ showShoppingListOnOpen: true });
        
        return {
            success: true,
            data: {
                recipeName: recipe.name,
                ingredientsAdded: ingredients.length,
                totalItems: updatedList.length
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Remove ingredient from shopping list
async function removeFromShoppingList(ingredientId) {
    const currentList = await getShoppingList();
    const updatedList = currentList.filter(item => item.id !== ingredientId);
    await saveShoppingList(updatedList);
    return updatedList;
}

// Listen for tab updates to detect URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only react to URL changes on Brewfather domain
    if (changeInfo.url && tab.url && tab.url.includes('web.brewfather.app')) {
        // Send message to content script about URL change
        chrome.tabs.sendMessage(tabId, {
            action: 'urlChanged',
            url: changeInfo.url
        }).catch(() => {
            // Ignore errors if content script isn't ready
        });
    }
});
