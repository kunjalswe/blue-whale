const { parseDuration, formatDuration } = require('../utils/duration.js');

const tests = [
  '10s',
  '5m',
  '1h',
  '2d',
  '1h30m',
  '1d12h',
  '1d 12h',
  '10 m',
  'invalid',
];

tests.forEach(t => {
  const ms = parseDuration(t);
  console.log(`Input: "${t}" -> MS: ${ms} -> Formatted: ${ms ? formatDuration(ms) : 'null'}`);
});
