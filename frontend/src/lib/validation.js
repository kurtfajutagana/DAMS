/**
 * Validation utilities for Teeth Talk Dental Clinic application
 */

/**
 * Validates whether a phone string is a valid Philippine mobile number.
 * Accepts formats:
 * - 09XXXXXXXXX (11 digits starting with 09)
 * - +639XXXXXXXXX (13 chars starting with +639)
 * - 9XXXXXXXXX (10 digits starting with 9)
 * - Numbers with spaces, dashes, or parentheses (e.g. 0917-123-4567, (0917) 123 4567)
 * 
 * Rejects non-numeric/gibberish strings (e.g. "dfcdfdfdfdf", "12345", etc.)
 */
export function isValidPhilippinePhone(phone) {
  if (!phone || typeof phone !== "string") return false;
  const clean = phone.replace(/[\s\-\(\)\.]/g, "");
  
  // Check for 09XXXXXXXXX (11 digits), +639XXXXXXXXX (13 chars), or 9XXXXXXXXX (10 digits)
  return /^(09|\+639|9)\d{9}$/.test(clean);
}

/**
 * Normalizes a Philippine mobile number to standard '09XXXXXXXXX' format.
 */
export function normalizePhilippinePhone(phone) {
  if (!phone || typeof phone !== "string") return "";
  let clean = phone.replace(/[\s\-\(\)\.]/g, "");
  if (clean.startsWith("+63")) {
    clean = "0" + clean.slice(3);
  } else if (clean.startsWith("63") && clean.length === 12) {
    clean = "0" + clean.slice(2);
  } else if (clean.startsWith("9") && clean.length === 10) {
    clean = "0" + clean;
  }
  return clean;
}

/**
 * Formats a Philippine mobile number cleanly for display (e.g., "0917 123 4567").
 */
export function formatPhoneDisplay(phone) {
  const norm = normalizePhilippinePhone(phone);
  if (norm.length === 11 && norm.startsWith("09")) {
    return `${norm.slice(0, 4)} ${norm.slice(4, 7)} ${norm.slice(7)}`;
  }
  return phone;
}
