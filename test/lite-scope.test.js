const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const codeDirs = ['routes', 'models', 'middleware', 'utils'];
const banned = ['stripe', 'paypal', 'cloudinary', 'coupon', 'bundle', 'routine', 'customeraccount', 'googlesignin', 'smtp', 'blogpost', 'analytics'];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

test('Lite application code contains no premium feature modules', () => {
  const text = codeDirs.flatMap(name => walk(path.join(root, name)))
    .filter(file => file.endsWith('.js'))
    .map(file => fs.readFileSync(file, 'utf8').toLowerCase())
    .join('\n');
  for (const word of banned) assert.equal(text.includes(word), false, `Found premium marker: ${word}`);
});
