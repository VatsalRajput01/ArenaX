// server/utils/idGenerator.js

/**
 * ID Generator Utilities
 * Generates human-friendly, unambiguous identifiers for game rooms.
 * Excludes visually similar characters to prevent read errors.
 */

const crypto = require('crypto');

/**
 * Alphanumeric character set excluding O, 0, I, 1, L to ensure readability.
 */
const ROOM_ID_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Configured length for room identification codes.
 */
const ROOM_ID_LENGTH = 6;

/**
 * Generates a single cryptographically random character from the defined charset.
 * Utilizes rejection sampling to ensure uniform distribution.
 * 
 * @returns {string} A random safe character
 */
function randomCharsetChar() {
  const maxUnbiased = Math.floor(256 / ROOM_ID_CHARSET.length) * ROOM_ID_CHARSET.length;
  let byte;
  do {
    byte = crypto.randomBytes(1)[0];
  } while (byte >= maxUnbiased);
  return ROOM_ID_CHARSET[byte % ROOM_ID_CHARSET.length];
}

/**
 * Generates a complete room identifier string based on the configured length.
 *
 * @returns {string} Normalized room code
 */
function generateRoomId() {
  let id = '';
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    id += randomCharsetChar();
  }
  return id;
}

/**
 * Sanitizes user input for robust room code matching.
 *
 * @param {string} raw - Unprocessed user input
 * @returns {string} Sanitized uppercase room code
 */
function normalizeRoomId(raw) {
  return String(raw).trim().toUpperCase();
}

module.exports = {
  generateRoomId,
  normalizeRoomId,
  ROOM_ID_CHARSET,
  ROOM_ID_LENGTH,
};