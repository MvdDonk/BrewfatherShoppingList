# Malt Substitution System Enhancement

## Overview
The Brewfather Shopping List extension has been upgraded with a comprehensive malt substitution system based on real brewing data from multiple authoritative sources.

## What Changed

### 1. Comprehensive Malt Database (`malt-substitution-database.json`)
Created a detailed database containing:
- **Base Malts**: 5 categories (Pilsner, Munich, Vienna, Wheat, Rye)
- **Crystal/Caramel Malts**: Complete color range coverage (10-400L)
- **Specialty Malts**: 6 categories (Chocolate, Black Patent, Victory, Special B, Acidulated, Dextrin)
- **Smoked Malts**: Complete coverage of smoked varieties
- **Manufacturer Equivalents**: Cross-reference tables for Weyermann, Castle, Simpsons brands
- **Substitution Rules**: Color tolerance guidelines and substitution best practices

### 2. Enhanced Substitution Logic (`background.js`)
- **Smart Categorization**: Uses grain name and color analysis instead of just `grainCategory`
- **Color-Based Matching**: Sophisticated color tolerance rules (±5L for light, ±10L for medium, ±20L for dark)
- **Database-Driven**: Leverages real brewing knowledge instead of simple category matching
- **Fallback Support**: Maintains original logic if database fails to load

### 3. Data Sources
Compiled from 4 authoritative brewing resources:
- https://www.brew.is/files/malt.html
- https://humebrew.com/crystal-malt-substitution-list/
- https://hobbybrouwshop.nl/moutsubstitutie/
- https://www.geterbrewed.com/brewing-grains/malt-substitution-guide/

## Key Improvements

### Before (Simple grainCategory matching)
```javascript
// Only compared grainCategory exactly
if (fermentable1.grainCategory !== fermentable2.grainCategory) {
    return false;
}
```

### After (Smart database-driven analysis)
```javascript
// Analyzes grain name, color, and brewing characteristics
const category1 = findGrainSubstitutionCategory(fermentable1, maltDatabase);
const category2 = findGrainSubstitutionCategory(fermentable2, maltDatabase);

// Uses professional brewing knowledge for substitution rules
const tolerance = color1 <= 10 ? 5.0 : color1 <= 100 ? 10.0 : 20.0;
```

## Example Improvements

### Your Recipe Analysis
With your "Deens kerstbier" recipe:
- **Lager & Pilsner**: Now correctly identified as interchangeable (both Base Pilsner category, 0.2L color difference)
- **Munich 60L**: Properly categorized as Base Munich (expanded range to include darker Munich varieties)
- **Crystal 80L**: Correctly identified as Crystal/Caramel with proper substitution options

### Real-World Benefits
1. **More Accurate**: Uses professional brewing knowledge instead of simple text matching
2. **Smarter Color Matching**: Different tolerances for light vs dark malts
3. **Better Categorization**: Recognizes grain by name patterns and characteristics
4. **Future-Proof**: Easy to expand database with new malts and rules

## Files Modified
- `background.js`: Added enhanced substitution logic
- `manifest.json`: Made database accessible to extension
- `malt-substitution-database.json`: New comprehensive database

## Testing Results
✅ All syntax checks pass
✅ Database loads correctly (5 base + 6 specialty + 1 smoked categories)
✅ Your recipe malts properly categorized:
- Lager → Base (Pilsner) ✓
- Pilsner → Base (Pilsner) ✓  
- Munich 60L → Base (Munich) ✓
- Crystal 80L → Crystal/Caramel ✓

The system now provides professional-grade malt substitution suggestions based on actual brewing science rather than simple text matching!
