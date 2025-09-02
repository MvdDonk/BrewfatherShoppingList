# Brewfather Shopping List Extension - Complete Context Document

**Date Created**: August 31, 2025  
**Last Updated**: September 2, 2025  
**Project**: Microsoft Edge Browser Extension for Brewfather Recipe Shopping Lists  
**Status**: Production Ready with Advanced Features  
**Version**: 2.0 (Multilingual & Enhanced UX)

## 📋 Project Overview

This document contains all the context, decisions, and**Prevention**: Always consider recipe **Prevention**: Always consider recipe context when implementing ingredient combination logic.

## 🌐 Multilingual Support Implementation

### Complete Internationalization System
**Date Implemented**: September 2, 2025

#### Architecture
- **Translation Engine**: `i18n.js` - Complete internationalization system
- **Language Detection**: Automatic system language detection with fallback
- **Supported Languages**: English (en), Dutch (nl), German (de), French (fr)
- **Translation Files**: Individual JSON files in `locales/` directory

#### Key Features Implemented

**System Language Following**:
- Users can select "Follow System Language" to automatically use their OS language
- Extension detects system language changes in real-time (30-second intervals)
- Smart fallback to English when system language is unsupported
- Clear notifications when system language is not supported

**Language Persistence**:
- Stores actual user preference ("system" vs specific language code)
- Maintains "Follow System Language" setting across browser sessions
- Only resolves to specific language when actually applying translations

**Real-time Updates**:
- All UI elements update instantly when language changes
- No page reload required for language switching
- Preview mode allows testing languages before saving

#### Technical Implementation

**i18n.js Class Structure**:
```javascript
class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.preferredLanguage = 'system'; // User's actual preference
        this.systemLanguage = 'en'; // Detected system language
        this.translations = {};
        this.supportedLanguages = ['en', 'nl', 'de', 'fr'];
        this.systemLanguageUnsupportedWarning = false;
    }
}
```

**Key Methods**:
- `detectSystemLanguage()`: Browser language detection
- `checkSystemLanguageChange()`: Real-time system language monitoring
- `setLanguage(code, save)`: Language setting with preference persistence
- `isSystemLanguageUnsupported()`: Warning status checking

**Translation File Structure**:
- Nested JSON objects for organized translations
- Parameter interpolation support (`{{variable}}`)
- Pluralization support (`key` and `key_plural`)
- Comprehensive coverage of all UI elements

#### Integration Points
- **popup.js**: Full interface translation for all views
- **options.js**: Settings page with real-time language switching
- **All HTML files**: Data attributes and content updated dynamically

### Preview Mode Settings System

#### Safe Settings Testing
**Date Implemented**: September 2, 2025

#### Architecture
- **Preview Mode**: All settings changes are temporary until explicitly saved
- **Automatic Revert**: Unsaved changes discarded when leaving settings
- **Real-time Feedback**: Immediate visual updates for all setting changes

#### Features Implemented

**Language Preview**:
- Language changes applied instantly to interface
- Warning messages for unsupported system languages
- No persistence until "Save Settings" clicked

**Theme Preview**:
- Theme changes applied immediately for visual testing
- Separate preview and saved theme application functions
- Reverts to saved theme if not explicitly saved

**Credentials Preview**:
- Form changes update test button state immediately
- No automatic saving of credential changes
- Clear validation feedback

**Revert Protection**:
- `beforeunload` event handling for page navigation
- `visibilitychange` event for tab switching
- Manual "Reset to Saved" button for immediate revert

#### Technical Implementation

**Settings Tracking**:
```javascript
let originalSettings = {
    theme: null,
    language: null,
    userId: '',
    apiKey: ''
};
```

**Preview Functions**:
- `applyThemePreview()`: Temporary theme application
- `handleLanguageChange()`: Language preview with warnings
- `revertToOriginalSettings()`: Complete settings revert

### Alphabetical Sorting System

#### Smart Ingredient Organization
**Date Implemented**: September 2, 2025

#### Implementation
- Ingredients sorted alphabetically within each group (Fermentables, Hops, Yeasts)
- Group order maintained: 1. Fermentables, 2. Hops, 3. Yeasts
- Case-insensitive sorting for consistent results

#### Technical Details
```javascript
// Sort function maintaining groups but alphabetizing within groups
const sortedItems = ingredients.sort((a, b) => {
    if (a.type !== b.type) {
        return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
});
```

## 💾 Backup & Recoverytext when implementing ingredient combination logic.

### Pop-out Window Implementation

#### Issue: Static Pop-out Window vs Dynamic Extension Behavior
**Problem**: Original pop-out functionality created a static HTML page that didn't have the same interactive features as the popup extension.

**Root Cause**: The pop-out was generating static HTML instead of using the same JavaScript logic as the popup.

**Solution**: Created a dedicated `standalone.html` file that includes the same structure and JavaScript as the popup but:
1. Detects context using `data-context="standalone"` attribute and window properties
2. Automatically shows shopping list view instead of main menu
3. Disables functionality that requires tab access (adding recipes)
4. Includes standalone-specific controls (refresh, close buttons)
5. Uses `chrome.runtime.getURL('standalone.html')` to open the full extension interface

**Key Implementation Details**:
```javascript
// Context detection
const isStandalone = document.body.dataset.context === 'standalone' || 
                    window.location.protocol === 'chrome-extension:' && 
                    window.opener === null && 
                    window.parent === window;

// Conditional behavior in popup.js
if (isStandalone) {
    setupEventListeners();
    showShoppingListView();
    return;
}
```

**Files Modified**:
- `standalone.html` - New file with full extension interface
- `popup.js` - Added context detection and conditional behavior
- `manifest.json` - No changes needed (file automatically accessible)

**Prevention**: Always use the same JavaScript logic for both popup and standalone modes, only adjusting behavior based on context detection.

## 💾 Backup & Recoveryplementation details for the Brewfather Shopping List browser extension. This is intended for future AI assistants working on this project.

### Purpose
Create a Microsoft Edge browser extension that allows users to generate shopping lists from Brewfather brewing recipes by integrating with the Brewfather API.

### Key Requirements Fulfilled
1. ✅ Detect when user is on Brewfather recipe pages
2. ✅ Inject "Add to Shopping List" button on recipe pages
3. ✅ Fetch recipe data using Brewfather API v2
4. ✅ Extract and aggregate ingredients (fermentables, hops, yeasts)
5. ✅ Store shopping list persistently with alphabetical sorting
6. ✅ Provide export functionality (Text, CSV, PDF)
7. ✅ Secure credential management with preview mode
8. ✅ Complete multilingual support (4 languages)
9. ✅ System language detection and following
10. ✅ Safe settings preview with automatic revert
11. ✅ Ingredient substitution suggestions
12. ✅ Responsive design for popup and standalone modes

## 🏗️ Architecture & Technical Decisions

### Browser Extension Structure (Manifest V3)
- **Content Script**: Detects recipe pages and injects UI button
- **Background Service Worker**: Handles API calls and data management
- **Popup Interface**: Displays shopping list and management tools
- **Options Page**: Configuration for API credentials

### Key Technical Decisions Made

#### 1. Ingredient Uniqueness Strategy
- **Decision**: Use `_id` field from Brewfather recipe JSON for ingredient uniqueness
- **Rationale**: Same ingredient from different suppliers should be treated as different items
- **Implementation**: Ingredients with same `_id` get quantities aggregated across recipes

#### 2. API Integration Approach
- **Endpoint Used**: `https://api.brewfather.app/v2/recipes/:id`
- **Authentication**: HTTP Basic Auth with base64-encoded `userid:apikey`
- **Rate Limiting**: 500 calls per hour per API key (handled with proper error messages)

#### 3. Ingredient Processing Rules
Based on actual Brewfather recipe JSON structure:

**Fermentables** (`recipe.fermentables[]`):
- Amount unit: `kg` (kilograms)
- Unique by: `_id` field
- Additional data: `name`, `type`, `origin`, `supplier`, `color`, `potential`

**Hops** (`recipe.hops[]`):
- Amount unit: `g` (grams)
- Unique by: `_id` field
- **Special handling**: Same hop used multiple times in recipe gets aggregated
- Additional data: `name`, `alpha`, `type`, `origin`, `use`, `time`

**Yeasts** (`recipe.yeasts[]`):
- Amount unit: From `unit` field (typically "pkg")
- Unique by: `_id` field
- Additional data: `name`, `laboratory`, `type`, `form`, `attenuation`

**Excluded**: `recipe.miscs[]` (per user request)

#### 4. Data Storage Strategy
- **Credentials**: Chrome sync storage (encrypted, syncs across devices)
- **Shopping Lists**: Chrome local storage (device-specific)
- **Storage Keys**: Defined in background.js STORAGE_KEYS constant

## 📁 File Structure & Implementation

### Core Files Created
```
BrewfatherShoppingList/
├── manifest.json              # Extension configuration (Manifest V3)
├── content.js                 # Recipe page detection & button injection
├── content.css                # Styling for injected button
├── background.js              # API calls & data management service worker
├── popup.html                 # Shopping list viewer interface
├── popup.js                   # Shopping list display logic
├── popup.css                  # Popup styling
├── options.html               # Settings/configuration page
├── options.js                 # Settings management
├── options.css                # Settings page styling
├── icons/                     # Extension icons (placeholders)
├── README.md                  # User documentation
└── recipe.json                # Example API response for reference
```

### User Modifications Made
The user made manual edits to several files after initial implementation. Key changes observed:

**popup.js**:
- Modified the initialization flow in `initializePopup()` function
- Moved `setupEventListeners()` call to always execute, even when credentials missing
- **NEW**: Added main menu interface with three options
- **NEW**: Added auto-navigation to shopping list after adding recipes
- **NEW**: Added popup state management with local storage flags

**content.js**:
- Modified button injection selectors to include `'body'` as first option
- **UPDATED**: Now injects button inside `ion-title` element for inline positioning
- **NEW**: Triggers shopping list display after successful recipe addition

**content.css**:
- Added `position: absolute` and `top: 5px` to button positioning (later changed)
- **UPDATED**: Changed to inline-block positioning to stick next to title text
- **NEW**: Added relative positioning for ion-toolbar/ion-header containers

**background.js**:
- **NEW**: Added tab event monitoring for URL changes
- **NEW**: Added popup state management with storage flags
- **NEW**: Added showShoppingList message handler

## 🔧 Implementation Details

### Recipe Page Detection
- **URL Pattern**: `/tabs/recipes/recipe/[recipe-id]`
- **Regex Used**: `/\/tabs\/recipes\/recipe\/([^\/]+)/`
- **Button Injection**: Injects inside `ion-title` element for inline positioning

### Extension Popup Interface
- **Main Menu**: Three options when clicking extension icon:
  1. **Add to Shopping List**: Adds current recipe (if on recipe page)
  2. **Show Shopping List**: View and manage shopping list
  3. **Settings**: Configure API credentials
- **Auto-Navigation**: After adding recipe, automatically shows shopping list
- **State Management**: Uses local storage flag to control popup behavior

### API Error Handling
Comprehensive error handling for:
- 401: Invalid credentials
- 403: Insufficient API scope permissions
- 404: Recipe not found
- 429: Rate limit exceeded
- Network errors
- Malformed responses

### Shopping List Features
- **Grouping**: Ingredients grouped by type (Fermentables, Hops, Yeasts)
- **Aggregation**: Same `_id` ingredients combined across recipes
- **Recipe Tracking**: Each ingredient tracks source recipes
- **Export Formats**:
  - Text: Human-readable with sections
  - CSV: Spreadsheet compatible
  - PDF: Browser print functionality

### Security Considerations
- Credentials stored in Chrome's encrypted sync storage
- No third-party data transmission (only to Brewfather API)
- Content Security Policy compliant
- No eval() or unsafe inline scripts

## 📊 Data Flow

### Adding Recipe to Shopping List
1. User clicks "Add to Shopping List" button on recipe page
2. Content script extracts recipe ID from URL
3. Background script fetches recipe from Brewfather API
4. Recipe JSON parsed to extract ingredients
5. Ingredients processed and aggregated with existing shopping list
6. Updated shopping list saved to local storage
7. Success feedback shown to user

### Shopping List Management
1. Popup opens and checks for credentials
2. If configured, loads shopping list from local storage
3. Displays grouped and formatted ingredients
4. Allows individual item removal or bulk clear
5. Export functionality generates formatted output

## 🔑 Configuration Requirements

### Brewfather API Setup
Users must obtain from Brewfather settings:
1. **User ID**: Found in Brewfather Settings → API section
2. **API Key**: Generated in Brewfather Settings → API section
3. **Required Scope**: "Read Recipes" must be enabled

### Extension Installation
1. Load as unpacked extension in Edge developer mode
2. Configure credentials in extension options
3. Test connection to verify setup

## 🐛 Known Issues & Considerations

### Potential Issues
1. **Button Injection**: Brewfather's SPA navigation might require button re-injection
2. **Rate Limiting**: Users with many recipes might hit 500/hour limit
3. **Recipe Changes**: Updated recipes won't automatically update shopping list
4. **Icon Files**: Placeholder icons need replacement with proper brewing-themed icons

### Browser Compatibility
- **Primary Target**: Microsoft Edge (Chromium-based)
- **Compatibility**: Should work in Chrome/Brave with minimal changes
- **Manifest Version**: Uses V3 (required for new extensions)

## 📈 Future Enhancement Opportunities

### Requested Features
1. ✅ Text export
2. ✅ CSV export  
3. ✅ PDF export (implemented via print)

### Potential Enhancements
1. Recipe scaling functionality (e.g., double batch)
2. Unit conversion (metric to imperial)
3. Integration with brewing supply stores
4. Inventory tracking integration
5. Multiple shopping list support
6. Shopping list sharing functionality

## 🔗 API Reference

### Brewfather API v2 Documentation
- **Base URL**: `https://api.brewfather.app/v2/`
- **Authentication**: Basic Auth (`userid:apikey`)
- **Rate Limit**: 500 requests/hour
- **Documentation**: https://docs.brewfather.app/api

### Key Endpoints Used
- `GET /v2/recipes/:id` - Fetch specific recipe

### Example Recipe JSON Structure
See `recipe.json` file for complete example. Key ingredients structure:
```json
{
  "fermentables": [
    {
      "_id": "unique-id",
      "name": "Ingredient Name",
      "amount": 1.814,  // in kg
      "type": "Grain",
      "origin": "Country",
      "supplier": "Supplier Name"
    }
  ],
  "hops": [
    {
      "_id": "unique-id", 
      "name": "Hop Name",
      "amount": 14.2,  // in grams
      "alpha": 3.75,
      "time": 60,
      "use": "Boil"
    }
  ],
  "yeasts": [
    {
      "_id": "unique-id",
      "name": "Yeast Name", 
      "amount": 2,
      "unit": "pkg",
      "laboratory": "Lab Name"
    }
  ]
}
```

## 🎯 Testing Checklist

### Pre-Deployment Testing
- [ ] Extension loads in Edge developer mode
- [ ] Credentials can be saved and tested
- [ ] Button appears on recipe pages
- [ ] API calls work with real credentials
- [ ] Shopping list displays ingredients correctly
- [ ] Export functions generate proper output
- [ ] Error handling works for various scenarios

### User Acceptance Testing
- [ ] Non-technical user can install and configure
- [ ] Button is easily discoverable on recipe pages
- [ ] Shopping list is intuitive to navigate
- [ ] Export formats are usable
- [ ] Error messages are helpful

## � Common Issues & Solutions

### CSS Layout Problems

#### Issue: Headers Appearing on Left Side Instead of Top
**Problem**: When adding new views to the popup, headers may appear positioned incorrectly (on the left side instead of at the top of the view).

**Root Cause**: Missing CSS flex layout rules for new view containers.

**Solution**: Every new view container must have the following CSS rules:
```css
#newViewId {
    height: 100%;
    display: flex;
    flex-direction: column;
}
```

**Examples Fixed**:
- `#shoppingListView` - Added proper flex layout
- `#substitutionsView` - Added proper flex layout

**Prevention**: When creating new views, ALWAYS add the view-specific CSS with flex layout rules immediately after adding the HTML structure.

### Ingredient Substitution Logic

#### Issue: Ingredients from Same Recipe Being Combined
**Problem**: The substitution feature was incorrectly suggesting to combine similar ingredients that came from the same recipe.

**Root Cause**: The `areInterchangeable()` function didn't check recipe origins.

**Solution**: Updated `areInterchangeable()` function to check `recipeIds` arrays and return `false` if ingredients share any common recipe ID:
```javascript
// Never combine ingredients from the same recipe
if (fermentable1.recipeIds && fermentable2.recipeIds) {
    const hasCommonRecipe = fermentable1.recipeIds.some(recipeId => 
        fermentable2.recipeIds.includes(recipeId)
    );
    if (hasCommonRecipe) {
        return false;
    }
}
```

**Prevention**: Always consider recipe context when implementing ingredient combination logic.

## �💾 Backup & Recovery

### Critical Files for Backup
- All source files in project directory
- `locales/` directory with all translation files
- User credentials (stored in browser, not files)
- Shopping list data (stored locally per browser)

### Version Control
- Repository should include all source files
- Include all translation files and i18n system
- Exclude any files containing actual API credentials
- Include example configuration for documentation

### Recent Major Updates Summary

#### September 2, 2025 - Comprehensive Enhancement Release
1. **Complete Multilingual Support**: 4-language system with intelligent detection
2. **Preview Mode Settings**: Safe testing environment for all settings
3. **Alphabetical Sorting**: Enhanced shopping list organization
4. **System Language Following**: Real-time detection and adaptation
5. **Enhanced User Experience**: Automatic revert protection and clear feedback

#### Key Files Modified
- `i18n.js` - Complete rewrite for advanced internationalization
- `options.js` - Enhanced with preview mode and language detection
- `locales/*.json` - New translation files for 4 languages
- `popup.js` - Integrated with i18n system
- `README.md` - Updated documentation for all new features

#### Backwards Compatibility
- All existing functionality preserved
- Settings migrate automatically to new system
- No breaking changes for existing users

---

**Note**: This document should be updated whenever significant changes are made to the extension. It serves as the definitive reference for understanding the project's context, decisions, and implementation details.
