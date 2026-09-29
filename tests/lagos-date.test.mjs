import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, dateParts, fullLagosDate, monthWeeks, relativeDayLabel } from '../src/features/records/lagos-date.ts';

test('calendar grid is Monday-first, complete weeks, and covers every day of the month once', () => {
  const weeks = monthWeeks('2026-09-28'); // 1 September 2026 is a Tuesday
  assert.equal(weeks[0][0], null); assert.equal(weeks[0][1], '2026-09-01');
  assert.ok(weeks.every(week => week.length === 7));
  const days = weeks.flat().filter(Boolean);
  assert.equal(days.length, 30); assert.equal(days.at(-1), '2026-09-30');
  assert.equal(monthWeeks('2024-02-10').flat().filter(Boolean).length, 29); // leap year
});
test('month stepping and date labels stay on calendar dates across year ends', () => {
  assert.equal(addMonths('2026-12-31', 1), '2027-01-01');
  assert.equal(addMonths('2026-01-15', -1), '2025-12-01');
  assert.deepEqual(dateParts('2026-09-28'), { month: 'SEP', day: '28', weekday: 'Mon' });
  assert.equal(fullLagosDate('2026-09-28'), 'Monday 28 September 2026'.replace('Monday ', 'Monday, '));
  assert.equal(relativeDayLabel('2026-09-29', '2026-09-29'), 'Today');
  assert.equal(relativeDayLabel('2026-09-28', '2026-09-29'), 'Yesterday');
  assert.equal(relativeDayLabel('2026-09-01', '2026-09-29'), '28 days ago');
});
