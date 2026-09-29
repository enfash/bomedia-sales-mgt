import assert from 'node:assert/strict';
import test from 'node:test';
import { createLatestRead } from '../src/services/latest-read.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('slow previous date cannot replace the newer date even if transport ignores abort', async () => {
  const reader = createLatestRead();
  const oldDate = deferred();
  const newDate = deferred();
  const displayed = [];
  let oldSignal;
  const first = reader.run(signal => { oldSignal = signal; return oldDate.promise; }, value => displayed.push(value), assert.fail);
  const second = reader.run(() => newDate.promise, value => displayed.push(value), assert.fail);
  assert.equal(oldSignal.aborted, true);
  newDate.resolve('September 7 invoices');
  await second;
  oldDate.resolve('September 6 invoices');
  await first;
  assert.deepEqual(displayed, ['September 7 invoices']);
});

test('changing search or leaving a tab suppresses responses and errors before another read starts', async () => {
  for (const fails of [false, true]) {
    const reader = createLatestRead();
    const pending = deferred();
    const changes = [];
    const running = reader.run(() => pending.promise, value => changes.push(value), error => changes.push(error));
    reader.cancel();
    if (fails) pending.reject(new Error('old search failed'));
    else pending.resolve('old search results');
    await running;
    assert.deepEqual(changes, []);
  }
});

test('current refresh failure is reported and a subsequent retry can recover', async () => {
  const reader = createLatestRead();
  const changes = [];
  await reader.run(async () => { throw new Error('offline'); }, assert.fail, error => changes.push(error.message));
  await reader.run(async () => 'updated balance', value => changes.push(value), assert.fail);
  assert.deepEqual(changes, ['offline', 'updated balance']);
});
