import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nairaToKobo, paymentError, formatNaira } from '../src/features/sales/domain/money.ts';
const valid = { total: '100000', received: '1000', method: 'cash', phone: '', customerSelected: true };
test('money parsing preserves actual payments without rounding', () => {
  assert.equal(nairaToKobo('276.25'), '27625');
  assert.equal(nairaToKobo('0.01'), '1');
  assert.equal(formatNaira('1'), '₦0.01');
  for (const value of ['', '-1', '1.001', '1e5', 'NaN']) assert.equal(nairaToKobo(value), null);
});
test('payment requires explicit recognized method', () => {
  assert.equal(paymentError(valid), null);
  assert.ok(paymentError({ ...valid, method: null }));
  assert.ok(paymentError({ ...valid, method: 'other' }));
});
test('credit requires saved or entered phone, fully paid does not', () => {
  assert.ok(paymentError({ ...valid, received: '500' }));
  assert.equal(paymentError({ ...valid, received: '500', phone: '08000000001' }), null);
  assert.equal(paymentError({ ...valid, received: '0', phone: '08000000001', method: null }), null);
});
test('overpayment and unselected customer block confirmation', () => {
  assert.ok(paymentError({ ...valid, received: '1000.01' }));
  assert.ok(paymentError({ ...valid, customerSelected: false }));
});
