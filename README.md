# Brewfather Shopping List Browser Extension

A Microsoft Edge browser extension that creates shopping lists from your Brewfather recipes.

## Features

- 🍺 **One-Click Shopping Lists**: Add ingredients from any Brewfather recipe to your shopping list
- 🔗 **Smart Integration**: Automatically detects when you're viewing a recipe on Brewfather
- 📊 **Ingredient Aggregation**: Combines quantities when adding the same ingredient from multiple recipes
- 🧩 **Ingredient Substitutions**: Smart suggestions to combine similar ingredients for optimized shopping
- 📤 **Multiple Export Formats**: Export your shopping list as Text, CSV, or PDF
- 🌙 **Theme Support**: Choose between Light Mode, Dark Mode, or Follow System Settings
- 🌐 **Multilingual Support**: Available in English, Dutch, German, and French with automatic system language detection
- 📱 **Responsive Design**: Works seamlessly in popup and standalone window modes
- ⚙️ **Preview Mode Settings**: Test all settings changes before saving with automatic revert protection
- 🔒 **Secure**: Your API credentials are stored securely in your browser

## Installation

1. Download or clone this repository
2. Open Microsoft Edge and go to `edge://extensions/`
3. Enable "Developer mode" in the bottom-left corner
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

## Setup

### Get Your Brewfather API Credentials

1. Go to [web.brewfather.app](https://web.brewfather.app/) and log in
2. Click on your profile/settings in the top right corner
3. Find the "API" section in your settings
4. Click "GENERATE" to create a new API key
5. **Important**: Make sure to select the "Read Recipes" scope when generating your key
6. Copy both your User ID and the generated API Key

### Configure the Extension

1. Click the extension icon in your toolbar
2. Click "Open Settings" or right-click the extension and select "Options"
3. **Set Your Theme Preference**: Choose between "Follow System Settings", "Light Mode", or "Dark Mode"
4. **Set Your Language Preference**: Choose between "Follow System Language", or select a specific language (English, Dutch, German, French)
5. Enter your Brewfather User ID and API Key
6. Click "Save Settings" to apply your changes
7. Click "Test Connection" to verify your credentials work

### Settings Preview Mode

The extension features a safe preview mode for all settings:
- **Theme changes**: Applied immediately for preview but not saved until you click "Save Settings"
- **Language changes**: Interface updates instantly to show the new language
- **Automatic revert**: If you close settings without saving, all changes are automatically reverted
- **Reset option**: Use "Reset to Saved" to discard all unsaved changes

## How to Use

1. Navigate to any recipe page on Brewfather (`https://web.brewfather.app/tabs/recipes/recipe/[recipe-id]`)
2. Look for the "🛒 Add to Shopping List" button that appears on the page
3. Click the button to add all ingredients from that recipe to your shopping list
4. Click the extension icon to view your shopping list
5. **View Substitutions** (if available): Check the substitutions page for ingredient optimization suggestions
6. Add more recipes or export your list when ready

### Ingredient Substitutions

The extension analyzes your shopping list and suggests combining similar ingredients:
- **Smart Detection**: Identifies ingredients that can be substituted for each other
- **Optimization**: Suggests purchasing larger quantities of versatile ingredients
- **Recipe Tracking**: Shows which recipes each substituted ingredient comes from
- **Optional Application**: You choose which substitutions to apply

## Supported Ingredients

The extension extracts these ingredient types from recipes:

- **🌾 Fermentables**: All grains, sugars, and fermentable ingredients (amounts in kg)
- **🌿 Hops**: All hop varieties with quantities aggregated if used multiple times (amounts in grams)
- **🦠 Yeasts**: All yeast strains and quantities (amounts in packages or as specified)

*Note: Miscellaneous ingredients (salts, clarifiers, etc.) are currently not included in shopping lists.*

## Shopping List Features

- **Alphabetical Sorting**: Ingredients are sorted alphabetically within each group for easy shopping
- **Ingredient Grouping**: Items are organized by type (Fermentables, Hops, Yeasts)
- **Smart Aggregation**: Same ingredients from multiple recipes are combined automatically
- **Recipe Tracking**: See which recipes each ingredient comes from
- **Easy Management**: Remove individual items or clear the entire list
- **Export Options**: Download your list in Text, CSV, or PDF format
- **Substitution Suggestions**: Get recommendations for ingredient optimization

## Export Formats

### Text Format
- Human-readable format with sections for each ingredient type
- Includes ingredient details and source recipes
- Perfect for printing or sharing

### CSV Format
- Spreadsheet-compatible format
- Columns: Name, Amount, Unit, Type, Details, Recipes
- Great for further processing or inventory management

### PDF Format
- Professional printable format
- Organized by ingredient type with clear formatting
- Ideal for taking to the store

## Multilingual Support

The extension supports multiple languages with intelligent detection:

### Supported Languages
- **English** (en) - Default and fallback language
- **Dutch** (nl) - Nederlands
- **German** (de) - Deutsch  
- **French** (fr) - Français

### Language Detection
- **System Language Following**: Automatically detects and uses your system language
- **Manual Override**: Choose a specific language regardless of system settings
- **Fallback Handling**: Uses English when system language is not supported
- **Real-time Updates**: Language changes are applied immediately across the interface
- **Persistence**: Language preference is maintained across browser sessions

### System Language Features
- **Automatic Detection**: Follows changes to your system language automatically
- **Unsupported Language Notifications**: Clear warnings when system language is not available
- **Smart Fallback**: Seamlessly falls back to English while maintaining "Follow System" preference
- **Change Notifications**: Alerts when system language changes to a supported language

## Troubleshooting

### "Setup Required" Message
- Make sure you've entered both User ID and API Key in the extension settings
- Verify your credentials by clicking "Test Connection"

### "Authentication Failed" Error
- Double-check your User ID and API Key are correct
- Ensure your API key has "Read Recipes" scope enabled
- Try generating a new API key in Brewfather

### Button Not Appearing
- Make sure you're on a recipe page (URL should contain `/tabs/recipes/recipe/`)
- Try refreshing the page
- Check that the extension is enabled

### "Rate Limit Exceeded" Error
- Brewfather API allows 500 calls per hour
- Wait a bit before trying again
- Consider reducing the frequency of requests

### Language Issues
- **System language not supported**: The extension will show a warning and use English as fallback
- **Interface not updating**: Try refreshing the page or reopening the extension
- **Wrong language displayed**: Check your language setting in the extension options

### Settings Not Saving
- **Changes reverted**: Make sure to click "Save Settings" before closing the options page
- **Preview mode active**: Remember that changes are only previewed until explicitly saved
- **Connection issues**: Verify your internet connection for settings sync

## Technical Details

- **Manifest Version**: 3 (latest standard)
- **Permissions**: Storage, Active Tab, Scripting
- **API Version**: Uses Brewfather API v2
- **Storage**: Uses Chrome's sync storage for settings, local storage for shopping lists

## Privacy & Security

- Your API credentials are stored securely in your browser using Chrome's encrypted storage
- No data is sent to third-party servers (except Brewfather's official API)
- Shopping lists are stored locally in your browser
- The extension only accesses Brewfather domains

## Development

### File Structure
```
BrewfatherShoppingList/
├── manifest.json          # Extension configuration
├── content.js             # Content script for recipe pages
├── content.css            # Styling for injected button
├── background.js          # Service worker for API calls
├── popup.html/js/css      # Extension popup interface
├── options.html/js/css    # Settings page
├── i18n.js                # Translation system and language detection
├── locales/               # Translation files
│   ├── en.json           # English translations
│   ├── nl.json           # Dutch translations
│   ├── de.json           # German translations
│   └── fr.json           # French translations
├── icons/                 # Extension icons
└── README.md             # This file
```

### Key Features Implementation

#### Multilingual System
- **i18n.js**: Complete translation engine with system language detection
- **Dynamic Loading**: Translation files loaded on demand
- **Fallback Logic**: Graceful handling of unsupported languages
- **Real-time Updates**: Interface updates without page reload

#### Preview Mode Settings
- **Temporary Changes**: All settings changes are previewed before saving
- **Automatic Revert**: Unsaved changes are discarded when leaving settings
- **Safe Testing**: Users can explore settings without permanent changes

#### Smart Shopping Lists
- **Alphabetical Sorting**: Items sorted within groups for easier shopping
- **Ingredient Substitutions**: AI-powered suggestions for ingredient optimization
- **Multi-format Export**: Text, CSV, and PDF export options

### API Integration
- Uses Brewfather API v2: `https://api.brewfather.app/v2/recipes/:id`
- Authentication: HTTP Basic Auth with base64-encoded `userid:apikey`
- Rate limiting: 500 requests per hour per API key

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve this extension!

## License

This project is open source. Please check the license file for details.

---

**Note**: This extension is not officially affiliated with Brewfather. It's a community-created tool that uses Brewfather's public API.
