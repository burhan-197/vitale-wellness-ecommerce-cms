const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(String(password), salt, 64);
  return `${salt}:${Buffer.from(derived).toString('hex')}`;
}

async function verifyPassword(password, storedHash = '') {
  const [salt, keyHex] = String(storedHash).split(':');
  if (!salt || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const derived = Buffer.from(await scrypt(String(password), salt, expected.length));
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

module.exports = { hashPassword, verifyPassword };
