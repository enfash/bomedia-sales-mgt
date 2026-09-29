import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canGoNext, canGoPrevious, dayWindow as cashDayWindow, relativeDayLabel } from '../src/features/records/lagos-date.ts';

const today = '2026-09-29';
test('window ends at the selected day + 3, never after today', () => {
  assert.deepEqual(cashDayWindow(today, today), ['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29']);
  assert.deepEqual(cashDayWindow('2026-09-28', today), cashDayWindow(today, today));
  assert.deepEqual(cashDayWindow('2026-09-19', today), ['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22']);
  assert.deepEqual(cashDayWindow('2026-12-30', '2027-01-02').at(-1), '2027-01-02'); // year boundary, capped at today
});
test('staff window never starts before the seven-day history limit', () => {
  const minDate = '2026-09-23';
  assert.deepEqual(cashDayWindow(minDate, today, minDate), cashDayWindow(today, today));
});
test('relative label and step limits', () => {
  assert.equal(relativeDayLabel(today, today), 'Today');
  assert.equal(relativeDayLabel('2026-09-28', today), 'Yesterday');
  assert.equal(relativeDayLabel('2026-09-19', today), '10 days ago');
  assert.equal(canGoNext(today, today), false);
  assert.equal(canGoNext('2026-09-28', today), true);
  assert.equal(canGoPrevious('2026-09-23', '2026-09-23'), false);
  assert.equal(canGoPrevious('2026-09-19'), true);
});
