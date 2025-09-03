// Test script to verify updated color conversion functions
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

// Test cases with the updated formulas
console.log('Testing updated color conversions:');
console.log('SRM 10 -> SRM:', convertColor(10, 'SRM'), getColorUnitSymbol('SRM'));
console.log('SRM 10 -> EBC:', convertColor(10, 'EBC'), getColorUnitSymbol('EBC'));
console.log('SRM 10 -> Lovibond:', convertColor(10, 'Lovibond'), getColorUnitSymbol('Lovibond'));

console.log('\nSRM 5.5 -> SRM:', convertColor(5.5, 'SRM'), getColorUnitSymbol('SRM'));
console.log('SRM 5.5 -> EBC:', convertColor(5.5, 'EBC'), getColorUnitSymbol('EBC'));
console.log('SRM 5.5 -> Lovibond:', convertColor(5.5, 'Lovibond'), getColorUnitSymbol('Lovibond'));

console.log('\nSRM 25 -> SRM:', convertColor(25, 'SRM'), getColorUnitSymbol('SRM'));
console.log('SRM 25 -> EBC:', convertColor(25, 'EBC'), getColorUnitSymbol('EBC'));
console.log('SRM 25 -> Lovibond:', convertColor(25, 'Lovibond'), getColorUnitSymbol('Lovibond'));

console.log('\nTesting defaults:');
console.log('SRM 10 -> default:', convertColor(10, 'unknown'), getColorUnitSymbol('unknown'));

console.log('\nVerifying formula accuracy:');
console.log('SRM 2 -> Lovibond (should be ~2.0):', convertColor(2, 'Lovibond'), '°L');
console.log('SRM 10 -> EBC (should be 19.7):', convertColor(10, 'EBC'), 'EBC');
console.log('Formula check: (2 + 0.76) / 1.3546 =', ((2 + 0.76) / 1.3546).toFixed(1));
