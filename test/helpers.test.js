const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify } = require('../utils/slug');
const { hashPassword, verifyPassword } = require('../utils/password');

test('slugify creates clean slugs', () => {
  assert.equal(slugify('  Daily Wellness + Care  '), 'daily-wellness-care');
});

test('password hashes verify without storing plaintext', async () => {
  const hash = await hashPassword('example-password');
  assert.notEqual(hash, 'example-password');
  assert.equal(await verifyPassword('example-password', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});
