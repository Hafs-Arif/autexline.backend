/**
 * Backend Text Formatter for AutoShop
 * Automatically corrects capitalization for ALL text fields before saving to database
 */

/**
 * Smart text capitalization formatter
 * Automatically detects and corrects common capitalization issues
 */
const formatText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Technical abbreviations that should remain uppercase
  const technicalAbbreviations = [
    'SUV', 'MPV', 'LPG', 'CNG', 'ABS', 'ESP', 'GPS', 'DVD', 'CD', 'USB', 'HD', '4WD', 'AWD', 'RWD',
    'V6', 'V8', 'V12', 'TDI', 'TSI', 'GTI', 'RS', 'AMG', 'M3', 'M5', 'X5', 'X6', 'Q7', 'Q8',
    'CR-V', 'HR-V', 'X-Trail', 'Outback', 'Forester', 'CX-5', 'CX-30', 'RAV4', 'Highlander',
    'HP', 'kW', 'Nm', 'RPM', 'cc', 'L', 'km/h', 'mph', 'kg', 'lbs', 'mm', 'cm', 'm', 'ft', 'in',
    'A/C', 'AC', 'TV', 'DVD', 'VCR', 'PC', 'CPU', 'RAM', 'SSD', 'HDD', 'BMW'
  ];
  
  // Brand names that should get title case (first letter uppercase, rest lowercase)
  const brandNames = [
    'Audi', 'Mercedes', 'Volkswagen', 'Toyota', 'Honda', 'Nissan', 'Mazda', 'Ford',
    'Chevrolet', 'Hyundai', 'Kia', 'Volvo', 'Jaguar', 'Land Rover', 'Jeep', 'Dodge'
  ];
  
  // Words that should always be lowercase (unless first word)
  const lowercaseWords = [
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'is', 'it', 'no', 'not', 'of',
    'on', 'or', 'so', 'the', 'to', 'up', 'yet', 'with', 'from', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'among', 'within', 'without', 'against',
    'toward', 'towards', 'upon', 'over', 'under', 'beneath', 'behind', 'beside', 'beyond'
  ];

  // Split text into words
  const words = text.trim().split(/\s+/);
  
  return words.map((word, index) => {
    // Handle empty words
    if (!word) return word;
    
    // Check if it's an abbreviation (should remain uppercase)
    if (technicalAbbreviations.some(abbr => 
      word.toUpperCase() === abbr || 
      word.toLowerCase() === abbr.toLowerCase() ||
      word === abbr // Exact match for mixed case
    )) {
      return word.toUpperCase();
    }

    // Check if it's a brand name (should get title case)
    if (brandNames.some(brand => 
      word.toLowerCase() === brand.toLowerCase()
    )) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    
    // Check if it's a number or contains numbers (like V6, 4WD)
    if (/\d/.test(word)) {
      // If it's a known abbreviation with numbers, keep it uppercase
      if (technicalAbbreviations.some(abbr => 
        word.toUpperCase().includes(abbr) || 
        abbr.includes(word.toUpperCase())
      )) {
        return word.toUpperCase();
      }
      // Otherwise, apply title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    
    // First word should always be capitalized
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    
    // Check if it should be lowercase (articles, prepositions, etc.)
    if (lowercaseWords.includes(word.toLowerCase())) {
      return word.toLowerCase();
    }
    
    // Apply title case to other words
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

/**
 * Formats any object by automatically detecting and formatting ALL text fields
 * No need to specify field types - works universally
 */
const formatObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const formatted = { ...obj };
  
  Object.keys(formatted).forEach(key => {
    const value = formatted[key];
    
    // Format strings
    if (typeof value === 'string') {
      formatted[key] = formatText(value);
    }
    
    // Format arrays of strings
    else if (Array.isArray(value)) {
      formatted[key] = value.map(item => 
        typeof item === 'string' ? formatText(item) : item
      );
    }
    
    // Recursively format nested objects
    else if (typeof value === 'object' && value !== null) {
      formatted[key] = formatObject(value);
    }
  });
  
  return formatted;
};

/**
 * Formats form data before submission
 * Automatically formats ALL text fields
 */
const formatFormData = (formData) => {
  return formatObject(formData);
};

/**
 * Formats product data specifically for vehicles and parts
 * Ensures all text fields are properly formatted before database save
 */
const formatProductData = (productData, type = 'vehicle') => {
  if (!productData) return productData;
  
  const formatted = { ...productData };
  
  // Always format these key fields
  const textFields = [
    'title', 'name', 'description', 'location', 'color', 'fuel', 'transmission',
    'engine', 'make', 'model', 'brand', 'stockNo', 'chassisNo', 'engineCode',
    'modelCode', 'steering', 'versionClass', 'dimension', 'weight', 'capacity',
    'maxCapacity', 'comments', 'conditionComments'
  ];
  
  textFields.forEach(field => {
    if (formatted[field] && typeof formatted[field] === 'string') {
      formatted[field] = formatText(formatted[field]);
    }
  });
  
  // Format features array if present
  if (Array.isArray(formatted.features)) {
    formatted.features = formatted.features.map(feature => 
      typeof feature === 'string' ? formatText(feature) : feature
    );
  }
  
  // Format compatible vehicles array if present
  if (Array.isArray(formatted.compatibleVehicles)) {
    formatted.compatibleVehicles = formatted.compatibleVehicles.map(vehicle => 
      typeof vehicle === 'string' ? formatText(vehicle) : vehicle
    );
  }
  
  return formatted;
};

module.exports = {
  formatText,
  formatObject,
  formatFormData,
  formatProductData
}; 