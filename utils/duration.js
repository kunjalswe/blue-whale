/**
 * Parse a human-readable duration string into milliseconds.
 * Supports: s (seconds), m (minutes), h (hours), d (days).
 * Examples: 10s, 5m, 1h, 2d, 1h30m, 1d12h
 * @param {string} input - Duration string
 * @returns {number|null} Milliseconds, or null if invalid
 */
function parseDuration(input) {
  if (!input || typeof input !== 'string') return null;

  const cleaned = input.toLowerCase().replace(/\s+/g, '');
  if (!cleaned) return null;

  // Match all number + unit pairs
  const matches = cleaned.matchAll(/(\d+)([smhdw])/g);
  let totalMs = 0;
  let found = false;

  for (const match of matches) {
    found = true;
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': totalMs += value * 1000; break;
      case 'm': totalMs += value * 60000; break;
      case 'h': totalMs += value * 3600000; break;
      case 'd': totalMs += value * 86400000; break;
      case 'w': totalMs += value * 604800000; break;
    }
  }

  if (!found || totalMs <= 0) return null;
  return totalMs;
}

/**
 * Format milliseconds into a human-readable string.
 */
function formatDuration(ms) {
  if (ms < 1000) return '0s';

  const seconds = Math.floor(ms / 1000);
  const w = Math.floor(seconds / 604800);
  const d = Math.floor((seconds % 604800) / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (w > 0) parts.push(`${w}w`);
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);

  return parts.join(' ');
}

module.exports = { parseDuration, formatDuration };
