const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/lib/pos-payment.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const moduleBox = { exports: {} };
new Function('module', 'exports', source)(moduleBox, moduleBox.exports);
const { resolvePosPayment } = moduleBox.exports;

test('POS unpaid, advance and paid balances are resolved server-side', () => {
  assert.deepEqual(resolvePosPayment(5000, 'unpaid', 0), { status: 'unpaid', paidAmount: 0, balanceDue: 5000 });
  assert.deepEqual(resolvePosPayment(5000, 'advance', 2000), { status: 'advance', paidAmount: 2000, balanceDue: 3000 });
  assert.deepEqual(resolvePosPayment(5000, 'paid', 5000), { status: 'paid', paidAmount: 5000, balanceDue: 0 });
});

test('POS paid amount must stay within the order total', () => {
  assert.throws(() => resolvePosPayment(5000, 'advance', -1));
  assert.throws(() => resolvePosPayment(5000, 'advance', 6000));
});

test('provided paid amount determines status and cannot exceed total', () => {
  assert.deepEqual(resolvePosPayment(5000, 'paid', 2000), { status: 'advance', paidAmount: 2000, balanceDue: 3000 });
  assert.deepEqual(resolvePosPayment(5000, 'advance', 5000), { status: 'paid', paidAmount: 5000, balanceDue: 0 });
  assert.throws(() => resolvePosPayment(5000, 'paid', 5001));
});
