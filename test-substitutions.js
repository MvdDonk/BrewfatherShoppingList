// Test the new malt substitution system
const fs = require('fs');

// Load our database and test data
const maltDatabase = JSON.parse(fs.readFileSync('malt-substitution-database.json', 'utf8'));
const recipe = JSON.parse(fs.readFileSync('recipe.json', 'utf8'));

// Extract fermentables from recipe
const fermentables = recipe.fermentables.map(f => ({
    ...f,
    type: 'fermentable',
    id: f._id
}));

// Test our enhanced substitution logic
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
    
    return null;
}

console.log('=== Testing New Malt Substitution System ===\n');

// Test each fermentable
fermentables.forEach((fermentable, index) => {
    const category = findGrainSubstitutionCategory(fermentable, maltDatabase);
    console.log(`${index + 1}. ${fermentable.name}`);
    console.log(`   Category: ${fermentable.grainCategory}`);
    console.log(`   Color: ${fermentable.color} SRM`);
    console.log(`   Database Match: ${category ? category.category : 'None'}`);
    if (category) {
        console.log(`   Type: ${category.type}`);
        console.log(`   Description: ${category.data.description}`);
    }
    console.log('');
});

// Test if fermentables would be considered interchangeable
console.log('=== Substitution Analysis ===\n');

// Test Lager vs Pilsner (should be interchangeable)
const lager = fermentables.find(f => f.name === 'Lager');
const pilsner = fermentables.find(f => f.name === 'Pilsner');

if (lager && pilsner) {
    const lagerCat = findGrainSubstitutionCategory(lager, maltDatabase);
    const pilsnerCat = findGrainSubstitutionCategory(pilsner, maltDatabase);
    
    console.log(`Lager vs Pilsner:`);
    console.log(`  Lager category: ${lagerCat ? lagerCat.category : 'None'}`);
    console.log(`  Pilsner category: ${pilsnerCat ? pilsnerCat.category : 'None'}`);
    console.log(`  Color difference: ${Math.abs(lager.color - pilsner.color)} SRM`);
    console.log(`  Would be substitutable: ${lagerCat && pilsnerCat && lagerCat.category === pilsnerCat.category}`);
    console.log('');
}

console.log('=== Database Summary ===');
console.log(`Total base malt categories: ${Object.keys(maltDatabase.maltSubstitutions.baseMalts).length}`);
console.log(`Total specialty malt categories: ${Object.keys(maltDatabase.maltSubstitutions.specialtyMalts).length}`);
console.log(`Substitution guidelines: ${maltDatabase.substitutionRules.substitutionGuidelines.length}`);
console.log(`Color tolerance rules: Light=${maltDatabase.substitutionRules.colorTolerance.lightMalts}, Medium=${maltDatabase.substitutionRules.colorTolerance.mediumMalts}, Dark=${maltDatabase.substitutionRules.colorTolerance.darkMalts}`);
