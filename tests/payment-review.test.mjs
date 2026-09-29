import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewPayment } from '../src/features/payments/review.ts';
const context = { customerId:'customer',customerName:'Customer',balanceKobo:'500001',invoices:[
 {saleId:'old',invoiceNumber:'1',balanceKobo:'300000'},
 {saleId:'new',invoiceNumber:'2',balanceKobo:'200001'}] };
test('payment review preserves kobo and previews oldest-first partial allocation',()=>{
 assert.deepEqual(reviewPayment(context,'3500.01','cash').allocations.map(a=>[a.saleId,a.amountKobo]),[['old','300000'],['new','50001']]);
});
test('payment review requires explicit method, positive exact amount and current debt limit',()=>{
 for(const [amount,method] of [['1',null],['1','cheque'],['0','cash'],['1.001','cash'],['5000.02','cash']]) assert.throws(()=>reviewPayment(context,amount,method));
 assert.equal(reviewPayment(context,'5000.01','transfer').kobo,'500001');
});
test('payment review refuses incomplete balances instead of silently under-allocating',()=>{
 assert.throws(()=>reviewPayment({...context,invoices:context.invoices.slice(0,1)},'3500','pos'));
});
