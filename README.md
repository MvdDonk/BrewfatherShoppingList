# Brewfather Shopping List Browser Extension

A Microsoft Edge browser extension that creates shopping lists from your Brewfather recipes.

## Features

- 🍺 **One-Click Shopping Lists**: Add ingredients from any Brewfather recipe to your shopping list
- 🔗 **Smart Integration**: Automatically detects when you're viewing a recipe on Brewfather
- 📊 **Ingredient Aggregation**: Combines quantities when adding the same ingredient from multiple recipes
- 📤 **Multiple Export Formats**: Export your shopping list as Text, CSV, or PDF
- 🌙 **Dark Mode Support**: Automatically follows your system's dark/light mode preference, or set manually
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
4. Enter your Brewfather User ID and API Key
5. Click "Save Settings"
6. Click "Test Connection" to verify your credentials work

## How to Use

1. Navigate to any recipe page on Brewfather (`https://web.brewfather.app/tabs/recipes/recipe/[recipe-id]`)
2. Look for the "🛒 Add to Shopping List" button that appears on the page
3. Click the button to add all ingredients from that recipe to your shopping list
4. Click the extension icon to view your shopping list
5. Add more recipes or export your list when ready

## Supported Ingredients

The extension extracts these ingredient types from recipes:

- **🌾 Fermentables**: All grains, sugars, and fermentable ingredients (amounts in kg)
- **🌿 Hops**: All hop varieties with quantities aggregated if used multiple times (amounts in grams)
- **🦠 Yeasts**: All yeast strains and quantities (amounts in packages or as specified)

*Note: Miscellaneous ingredients (salts, clarifiers, etc.) are currently not included in shopping lists.*

## Shopping List Features

- **Ingredient Grouping**: Items are organized by type (Fermentables, Hops, Yeasts)
- **Smart Aggregation**: Same ingredients from multiple recipes are combined automatically
- **Recipe Tracking**: See which recipes each ingredient comes from
- **Easy Management**: Remove individual items or clear the entire list
- **Export Options**: Download your list in Text, CSV, or PDF format

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
├── icons/                 # Extension icons
└── README.md             # This file
```

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
