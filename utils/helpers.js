const Counter = require('../models/Counter');

/**
 * Parse a string or number value and extract numeric content
 * @param {string|number} val - The value to parse
 * @returns {number|undefined} - The parsed number or undefined if invalid
 */
const parseNumber = (val) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const n = cleaned ? parseFloat(cleaned) : NaN;
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
};

/**
 * Generate the next reference number for a given key
 * @param {string} key - The key for the reference number (e.g., 'vhl', 'part_ref', 'veh')
 * @returns {Promise<string>} - The generated reference number
 */
const getNextRefNo = async (key) => {
  try {
    const doc = await Counter.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const seq = String(doc.seq).padStart(6, '0');
    
    // Use consistent format for different types
    let refNo;
    if (key === 'part_ref') {
      refNo = `APT-${seq}`;
    } else if (key === 'vhl' || key === 'veh') {
      refNo = `VEH-${seq}`;
    } else {
      refNo = `${key.toUpperCase()}-${seq}`;
    }
    
    console.log(`Generated reference number: ${refNo} (counter: ${key}, sequence: ${doc.seq})`);
    return refNo;
  } catch (error) {
    console.error(`Error generating reference number for key '${key}':`, error);
    // Fallback reference number using timestamp
    const fallback = `${key === 'part_ref' ? 'APT' : key === 'vhl' || key === 'veh' ? 'VEH' : key.toUpperCase()}-${String(Date.now()).slice(-6)}`;
    console.log(`Using fallback reference number: ${fallback}`);
    return fallback;
  }
};

module.exports = {
  parseNumber,
  getNextRefNo
}; 