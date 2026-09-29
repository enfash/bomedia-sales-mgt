const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' });

export function todayLagos(): string {
  return formatter.format(new Date());
}
export function addDays(dateString: string, delta: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + delta * 86400000).toISOString().slice(0, 10);
}
export function daysBefore(dateString: string, reference: string): number {
  const [y1, m1, d1] = dateString.split('-').map(Number);
  const [y2, m2, d2] = reference.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

const readable = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

// "Wed 9 Sep 2026" for a yyyy-mm-dd business date. Formatted in UTC because the
// string is already a Lagos calendar date, not an instant to be converted again.
export function readableLagosDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return dateString;
  return readable.format(new Date(Date.UTC(year, month - 1, day)));
}

export function businessDateLabel(date: string, today: string): string {
  return date === today ? 'Today' : daysBefore(date, today) === 1 ? 'Yesterday' : 'Business date';
}

/** Lagos wall-clock time, matching the business date used by records and receipts. */
export function lagosTime(iso: string): string {
  try { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Lagos' }).format(new Date(iso)); }
  catch { return ''; }
}

const fullDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortMonth = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'short' });
const shortWeekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' });
const monthYear = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' });
function utc(dateString: string) { const [y, m, d] = dateString.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }

/** "Monday, 28 September 2026". */
export function fullLagosDate(dateString: string): string { return fullDate.format(utc(dateString)); }
/** Calendar badge parts: { month: 'SEP', day: '28', weekday: 'Mon' }. */
export function dateParts(dateString: string) {
  const date = utc(dateString);
  return { month: shortMonth.format(date).slice(0, 3).toUpperCase(), day: String(date.getUTCDate()), weekday: shortWeekday.format(date) };
}
/** Today / Yesterday / "3 days ago" relative to the Lagos business date. */
export function relativeDayLabel(date: string, today: string): string {
  const days = daysBefore(date, today);
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : days > 1 ? `${days} days ago` : readableLagosDate(date);
}
export function monthTitle(dateString: string): string { return monthYear.format(utc(dateString)); }
/** First day of the month shifted by `delta` months, as yyyy-mm-01. */
export function addMonths(dateString: string, delta: number): string {
  const date = utc(dateString);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1)).toISOString().slice(0, 10);
}
/** Monday-first weeks of the month containing `dateString`; days outside the month are null. */
export function monthWeeks(dateString: string): (string | null)[][] {
  const first = utc(addMonths(dateString, 0));
  const lead = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length }, (_, i) => new Date(first.getTime() + i * 86400000).toISOString().slice(0, 10))];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

/**
 * The seven business dates in a day strip: the week ending three days after the selected date,
 * never after today. With a lower bound (staff history) the window slides forward so it never
 * starts before `minDate`, still ending no later than today.
 */
export function dayWindow(selected: string, today: string, minDate?: string): string[] {
  let end = addDays(selected, 3) < today ? addDays(selected, 3) : today;
  if (minDate && addDays(end, -6) < minDate) end = addDays(minDate, 6) < today ? addDays(minDate, 6) : today;
  return Array.from({ length: 7 }, (_, index) => addDays(end, index - 6));
}
export function canGoNext(selected: string, today: string) { return selected < today; }
export function canGoPrevious(selected: string, minDate?: string) { return !minDate || selected > minDate; }
