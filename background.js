// Background script for handling API calls and data management

// Storage keys
const STORAGE_KEYS = {
    USER_ID: 'brewfatherUserId',
    API_KEY: 'brewfatherApiKey',
    SHOPPING_LIST: 'shoppingList',
    SUBSTITUTIONS: 'ingredientSubstitutions'
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
                color: fermentable.color,
                grainCategory: fermentable.grainCategory,
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

// Check if two fermentables are interchangeable
function areInterchangeable(fermentable1, fermentable2) {
    // Never combine ingredients from the same recipe
    if (fermentable1.recipeIds && fermentable2.recipeIds) {
        const hasCommonRecipe = fermentable1.recipeIds.some(recipeId => 
            fermentable2.recipeIds.includes(recipeId)
        );
        if (hasCommonRecipe) {
            return false;
        }
    }
    
    // Must have the same grain category
    if (fermentable1.grainCategory !== fermentable2.grainCategory) {
        return false;
    }
    
    // Calculate acceptable color range (±25% for lighter grains, ±20% for darker grains)
    const color1 = fermentable1.color;
    const color2 = fermentable2.color;
    
    // Use different tolerance based on color intensity
    let tolerance;
    if (color1 <= 10) {
        tolerance = 0.4; // 40% tolerance for very light grains
    } else if (color1 <= 50) {
        tolerance = 0.3; // 30% tolerance for light grains
    } else if (color1 <= 200) {
        tolerance = 0.25; // 25% tolerance for medium grains
    } else {
        tolerance = 0.2; // 20% tolerance for dark grains
    }
    
    const colorDifference = Math.abs(color1 - color2);
    const maxAllowedDifference = color1 * tolerance;
    
    return colorDifference <= maxAllowedDifference;
}

// Load malt substitution database
async function loadMaltDatabase() {
    try {
        const response = await fetch(chrome.runtime.getURL('malt-substitution-database.json'));
        return await response.json();
    } catch (error) {
        console.warn('Could not load malt substitution database:', error);
        return null;
    }
}

// Find best substitution category for a grain based on name and properties
function findGrainSubstitutionCategory(grain, maltDatabase) {
    if (!maltDatabase) return null;
    
    const grainName = grain.name.toLowerCase();
    const grainColor = grain.color || 0;
    const grainCategory = grain.grainCategory || '';
    
    // Helper function to check if grain matches a category
    const matchesCategory = (categoryData, searchTerms) => {
        return searchTerms.some(term => grainName.includes(term.toLowerCase()));
    };
    
    // Check base malts first
    for (const [categoryKey, categoryData] of Object.entries(maltDatabase.maltSubstitutions.baseMalts)) {
        const searchTerms = [];
        
        // Build search terms based on category
        if (categoryKey.includes('Pilsner')) {
            searchTerms.push('pilsner', 'pils', 'lager', '2-row', 'pale');
        } else if (categoryKey.includes('Munich')) {
            searchTerms.push('munich');
        } else if (categoryKey.includes('Vienna')) {
            searchTerms.push('vienna');
        } else if (categoryKey.includes('Wheat')) {
            searchTerms.push('wheat', 'weizen');
        } else if (categoryKey.includes('Rye')) {
            searchTerms.push('rye');
        }
        
        if (matchesCategory(categoryData, searchTerms) && 
            grainColor >= categoryData.colorRange.min && 
            grainColor <= categoryData.colorRange.max) {
            return { category: categoryKey, data: categoryData, type: 'base' };
        }
    }
    
    // Check crystal/caramel malts
    if (grainCategory.toLowerCase().includes('crystal') || grainCategory.toLowerCase().includes('caramel') ||
        grainName.includes('crystal') || grainName.includes('caramel') || grainName.includes('cara')) {
        const crystalData = maltDatabase.maltSubstitutions.crystalCaramel['Crystal/Caramel'];
        if (grainColor >= crystalData.colorRange.min && grainColor <= crystalData.colorRange.max) {
            return { category: 'Crystal/Caramel', data: crystalData, type: 'crystal' };
        }
    }
    
    // Check specialty malts
    for (const [categoryKey, categoryData] of Object.entries(maltDatabase.maltSubstitutions.specialtyMalts)) {
        const searchTerms = [];
        
        if (categoryKey === 'Chocolate') {
            searchTerms.push('chocolate', 'carafa');
        } else if (categoryKey === 'Black Patent') {
            searchTerms.push('black', 'patent', 'carafa iii');
        } else if (categoryKey === 'Victory') {
            searchTerms.push('victory', 'amber', 'biscuit');
        } else if (categoryKey === 'Special B') {
            searchTerms.push('special b', 'special w');
        } else if (categoryKey === 'Acidulated') {
            searchTerms.push('acid', 'sour');
        } else if (categoryKey === 'Dextrin/CaraPils') {
            searchTerms.push('dextrin', 'carapils', 'carafoam');
        }
        
        if (matchesCategory(categoryData, searchTerms) && 
            grainColor >= categoryData.colorRange.min && 
            grainColor <= categoryData.colorRange.max) {
            return { category: categoryKey, data: categoryData, type: 'specialty' };
        }
    }
    
    // Check smoked malts
    if (grainName.includes('smoked') || grainName.includes('peated') || grainName.includes('rauch')) {
        const smokedData = maltDatabase.maltSubstitutions.smokedMalts['Smoked'];
        return { category: 'Smoked', data: smokedData, type: 'smoked' };
    }
    
    return null;
}

// Enhanced interchangeable check using malt database
async function areInterchangeableEnhanced(fermentable1, fermentable2, maltDatabase) {
    // Never combine ingredients from the same recipe
    if (fermentable1.recipeIds && fermentable2.recipeIds) {
        const hasCommonRecipe = fermentable1.recipeIds.some(recipeId => 
            fermentable2.recipeIds.includes(recipeId)
        );
        if (hasCommonRecipe) {
            return false;
        }
    }
    
    // If we have the malt database, use enhanced logic
    if (maltDatabase) {
        const category1 = findGrainSubstitutionCategory(fermentable1, maltDatabase);
        const category2 = findGrainSubstitutionCategory(fermentable2, maltDatabase);
        
        // Both must be in the same substitution category
        if (!category1 || !category2 || category1.category !== category2.category) {
            return false;
        }
        
        // Check color tolerance based on malt type
        const color1 = fermentable1.color || 0;
        const color2 = fermentable2.color || 0;
        const rules = maltDatabase.substitutionRules.colorTolerance;
        
        let tolerance;
        if (color1 <= 10) {
            tolerance = rules.lightMalts;
        } else if (color1 <= 100) {
            tolerance = rules.mediumMalts;
        } else {
            tolerance = rules.darkMalts;
        }
        
        const colorDifference = Math.abs(color1 - color2);
        return colorDifference <= tolerance;
    }
    
    // Fallback to original logic if database not available
    return areInterchangeable(fermentable1, fermentable2);
}

// Find substitution suggestions for ingredients in shopping list
async function findSubstitutions(shoppingList) {
    const fermentables = shoppingList.filter(item => item.type === 'fermentable');
    const substitutions = [];
    
    // Load malt database for enhanced substitution logic
    const maltDatabase = await loadMaltDatabase();
    
    if (maltDatabase) {
        // Enhanced logic using malt database
        const categoryGroups = {};
        
        // Group fermentables by substitution category from database
        for (const fermentable of fermentables) {
            const categoryInfo = findGrainSubstitutionCategory(fermentable, maltDatabase);
            const categoryKey = categoryInfo ? categoryInfo.category : fermentable.grainCategory;
            
            if (!categoryGroups[categoryKey]) {
                categoryGroups[categoryKey] = [];
            }
            categoryGroups[categoryKey].push(fermentable);
        }
        
        // Find interchangeable ingredients within each category
        for (const [category, grains] of Object.entries(categoryGroups)) {
            if (grains.length > 1) {
                // Compare each grain with others in the same category
                for (let i = 0; i < grains.length; i++) {
                    for (let j = i + 1; j < grains.length; j++) {
                        const grain1 = grains[i];
                        const grain2 = grains[j];
                        
                        if (await areInterchangeableEnhanced(grain1, grain2, maltDatabase)) {
                            // Check if this substitution group already exists
                            let existingGroup = substitutions.find(group => 
                                group.ingredients.some(ing => ing.id === grain1.id || ing.id === grain2.id)
                            );
                            
                            if (existingGroup) {
                                // Add to existing group if not already present
                                if (!existingGroup.ingredients.some(ing => ing.id === grain1.id)) {
                                    existingGroup.ingredients.push(grain1);
                                    existingGroup.totalAmount += grain1.amount;
                                }
                                if (!existingGroup.ingredients.some(ing => ing.id === grain2.id)) {
                                    existingGroup.ingredients.push(grain2);
                                    existingGroup.totalAmount += grain2.amount;
                                }
                            } else {
                                // Create new substitution group
                                substitutions.push({
                                    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                    category: category,
                                    ingredients: [grain1, grain2],
                                    totalAmount: grain1.amount + grain2.amount,
                                    unit: grain1.unit
                                });
                            }
                        }
                    }
                }
            }
        }
    } else {
        // Fallback to original logic if database not available
        const categoryGroups = {};
        fermentables.forEach(fermentable => {
            const category = fermentable.grainCategory;
            if (!categoryGroups[category]) {
                categoryGroups[category] = [];
            }
            categoryGroups[category].push(fermentable);
        });
        
        // Find interchangeable ingredients within each category
        Object.entries(categoryGroups).forEach(([category, grains]) => {
            if (grains.length > 1) {
                // Compare each grain with others in the same category
                for (let i = 0; i < grains.length; i++) {
                    for (let j = i + 1; j < grains.length; j++) {
                        const grain1 = grains[i];
                        const grain2 = grains[j];
                        
                        if (areInterchangeable(grain1, grain2)) {
                            // Check if this substitution group already exists
                            let existingGroup = substitutions.find(group => 
                                group.ingredients.some(ing => ing.id === grain1.id || ing.id === grain2.id)
                            );
                            
                            if (existingGroup) {
                                // Add to existing group if not already present
                                if (!existingGroup.ingredients.some(ing => ing.id === grain1.id)) {
                                    existingGroup.ingredients.push(grain1);
                                    existingGroup.totalAmount += grain1.amount;
                                }
                                if (!existingGroup.ingredients.some(ing => ing.id === grain2.id)) {
                                    existingGroup.ingredients.push(grain2);
                                    existingGroup.totalAmount += grain2.amount;
                                }
                            } else {
                                // Create new substitution group
                                substitutions.push({
                                    id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                    category: category,
                                    ingredients: [grain1, grain2],
                                    totalAmount: grain1.amount + grain2.amount,
                                    unit: grain1.unit
                                });
                            }
                        }
                    }
                }
            }
        });
    }
    
    return substitutions;
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

// Save substitutions to storage
async function saveSubstitutions(substitutions) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SUBSTITUTIONS]: substitutions });
}

// Get substitutions from storage
async function getSubstitutions() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.SUBSTITUTIONS]);
    return result[STORAGE_KEYS.SUBSTITUTIONS] || [];
}

// Apply a substitution choice (replace multiple ingredients with one)
async function applySubstitution(substitutionId, chosenIngredientId) {
    const substitutions = await getSubstitutions();
    const substitution = substitutions.find(sub => sub.id === substitutionId);
    
    if (!substitution) {
        throw new Error('Substitution not found');
    }
    
    const chosenIngredient = substitution.ingredients.find(ing => ing.id === chosenIngredientId);
    if (!chosenIngredient) {
        throw new Error('Chosen ingredient not found in substitution group');
    }
    
    // Get current shopping list
    const shoppingList = await getShoppingList();
    
    // Remove all ingredients from the substitution group
    const updatedList = shoppingList.filter(item => 
        !substitution.ingredients.some(ing => ing.id === item.id)
    );
    
    // Add the chosen ingredient with combined amount
    const combinedIngredient = {
        ...chosenIngredient,
        amount: substitution.totalAmount,
        recipeIds: substitution.ingredients.flatMap(ing => ing.recipeIds || []),
        recipeNames: substitution.ingredients.flatMap(ing => ing.recipeNames || [])
    };
    
    updatedList.push(combinedIngredient);
    
    // Save updated shopping list
    await saveShoppingList(updatedList);
    
    // Remove the applied substitution
    const updatedSubstitutions = substitutions.filter(sub => sub.id !== substitutionId);
    await saveSubstitutions(updatedSubstitutions);
    
    return { 
        shoppingList: updatedList, 
        substitutions: updatedSubstitutions 
    };
}

// Apply multiple substitutions at once
async function applyMultipleSubstitutions(substitutionsToApply) {
    try {
        // Process all substitutions sequentially to avoid conflicts
        for (const substitution of substitutionsToApply) {
            await applySubstitution(substitution.substitutionId, substitution.chosenIngredientId);
        }
        
        // Get final state
        const shoppingList = await getShoppingList();
        const substitutions = await getSubstitutions();
        
        return {
            shoppingList: shoppingList,
            substitutions: substitutions
        };
    } catch (error) {
        console.error('Error applying multiple substitutions:', error);
        throw error;
    }
}

// Generate new substitutions when shopping list changes
async function updateSubstitutions() {
    const shoppingList = await getShoppingList();
    const substitutions = await findSubstitutions(shoppingList);
    await saveSubstitutions(substitutions);
    return substitutions;
}

// Clear all substitutions
async function clearSubstitutions() {
    await chrome.storage.local.set({ [STORAGE_KEYS.SUBSTITUTIONS]: [] });
}

// Remove from shopping list
async function removeFromShoppingList(ingredientId) {
    const currentList = await getShoppingList();
    const updatedList = currentList.filter(item => item.id !== ingredientId);

    await saveShoppingList(updatedList);
    
    // Update substitutions after removing ingredient
    await updateSubstitutions();
    
    return updatedList;
}
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
        Promise.all([
            saveShoppingList([]),
            clearSubstitutions()
        ])
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
    
    if (message.action === 'getSubstitutions') {
        getSubstitutions()
            .then(substitutions => sendResponse({ success: true, data: substitutions }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'updateSubstitutions') {
        updateSubstitutions()
            .then(substitutions => sendResponse({ success: true, data: substitutions }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'applySubstitution') {
        applySubstitution(message.substitutionId, message.chosenIngredientId)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'applyMultipleSubstitutions') {
        applyMultipleSubstitutions(message.substitutions)
            .then(result => sendResponse({ success: true, data: result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'clearSubstitutions') {
        clearSubstitutions()
            .then(() => sendResponse({ success: true }))
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
        
        // Update substitutions after adding ingredients
        const substitutions = await updateSubstitutions();
        
        // Set flag to show shopping list when popup opens
        await chrome.storage.local.set({ showShoppingListOnOpen: true });
        
        return {
            success: true,
            data: {
                recipeName: recipe.name,
                ingredientsAdded: ingredients.length,
                totalItems: updatedList.length,
                substitutions: substitutions
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
