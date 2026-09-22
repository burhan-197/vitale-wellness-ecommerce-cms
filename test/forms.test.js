const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

test('form action attributes never contain injected HTML', () => {
  const files = walk(path.join(root, 'views')).filter(file => file.endsWith('.ejs'));
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(
      /action="[^"]*<input/i.test(source),
      false,
      `Malformed form action in ${path.relative(root, file)}`
    );
  }
});

test('every POST form contains a CSRF field', () => {
  const files = walk(path.join(root, 'views')).filter(file => file.endsWith('.ejs'));
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const forms = [...source.matchAll(/<form\b[^>]*method="post"[^>]*>([\s\S]*?)<\/form>/gi)];
    for (const match of forms) {
      assert.match(
        match[1],
        /name="_csrf"/i,
        `POST form missing CSRF field in ${path.relative(root, file)}`
      );
    }
  }
});

test('critical admin form actions are correctly structured', () => {
  const categories = fs.readFileSync(path.join(root, 'views/admin/pages/categories.ejs'), 'utf8');
  const products = fs.readFileSync(path.join(root, 'views/admin/pages/products.ejs'), 'utf8');
  const orders = fs.readFileSync(path.join(root, 'views/admin/pages/orders.ejs'), 'utf8');

  assert.match(categories, /action="<%= editCategory \? `\/admin\/categories\/\$\{editCategory\._id\}\/update` : '\/admin\/categories' %>"/);
  assert.match(categories, /action="\/admin\/categories\/<%= category\._id %>\/delete"/);
  assert.match(products, /action="<%= editProduct \? `\/admin\/products\/\$\{editProduct\._id\}\/update` : '\/admin\/products' %>"/);
  assert.match(products, /action="\/admin\/products\/<%= product\._id %>\/delete"/);
  assert.match(orders, /action="\/admin\/orders\/<%= order\._id %>\/status"/);
});
