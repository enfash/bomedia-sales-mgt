import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateItem, formatItemArea, invoiceTotal } from '../src/features/sales/domain/pricing.ts';
const item = (rateNaira, overrides = {}) => calculateItem({ width: '1', height: '1', quantity: '1', unit: 'ft', rateNaira, ...overrides });
test('rounds each item upward to tens, preserving calculated display', () => {
  assert.equal(item('276.25').calculatedKobo, '27625');
  assert.equal(item('276.25').chargedKobo, '28000');
  assert.equal(item('280').chargedKobo, '28000');
  assert.equal(item('280.01').chargedKobo, '29000');
  assert.equal(item('280.000001').chargedKobo, '29000');
});
test('inch conversion matches feet without intermediate rounding', () => {
  assert.equal(item('180', { width: '24', height: '36', unit: 'in' }).chargedKobo, item('180', { width: '2', height: '3' }).chargedKobo);
  assert.equal(item('180', { width: '13', height: '17', unit: 'in' }).chargedKobo, '28000');
});
test('area includes quantity and its display rounding never feeds the charge', () => {
  const size = { width: '13', height: '36', quantity: '2', unit: 'in' };
  assert.equal(formatItemArea(size), '6.50');
  assert.equal(calculateItem({ ...size, rateNaira: '180' }).chargedKobo, '117000');
  const small = { width: '1', height: '1', quantity: '1', unit: 'in' };
  assert.equal(formatItemArea(small), '0.01');
  assert.equal(calculateItem({ ...small, rateNaira: '1800' }).chargedKobo, '2000');
  assert.equal(formatItemArea({ ...size, width: '0.125', height: '1', quantity: '1', unit: 'ft' }), '0.13');
  assert.equal(formatItemArea({ ...size, width: '9999999999999999', height: '1', quantity: '1', unit: 'ft' }), '9999999999999999.00');
});
test('quantity and minimum apply at correct boundaries', () => {
  assert.equal(item('180', { width: '4', height: '5', quantity: '2' }).chargedKobo, '720000');
  assert.deepEqual(invoiceTotal(['30000', '30000', '30000']), { subtotalKobo: '90000', adjustmentKobo: '10000', totalKobo: '100000' });
  assert.equal(invoiceTotal(Array(25).fill('100000')).totalKobo, '2500000');
});
test('rejects invalid inputs and empty invoices', () => {
  for (const width of ['0', '-1', 'NaN', 'Infinity', '1e4', '']) assert.throws(() => item('180', { width }));
  assert.throws(() => item('180', { quantity: '2.5' }));
  assert.throws(() => invoiceTotal([]));
});
