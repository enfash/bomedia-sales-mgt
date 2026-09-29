export function nairaToKobo(value: string): string | null {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text) || text.length > 24) return null;
  const [whole, part = ''] = text.split('.');
  return (BigInt(whole) * BigInt(100) + BigInt(part.padEnd(2, '0'))).toString();
}
export function decimalNaira(kobo: string) {
  const negative = kobo.startsWith('-');
  const padded = (negative ? kobo.slice(1) : kobo).padStart(3, '0');
  return `${negative ? '-' : ''}${padded.slice(0, -2)}.${padded.slice(-2)}`;
}
export function formatNaira(kobo: string) {
  const [whole, part] = decimalNaira(kobo).split('.');
  return `₦${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${part}`;
}
export function paymentError(input: { total: string; received: string; method: string | null; phone: string; customerSelected: boolean }) {
  if (!input.customerSelected) return 'Select a customer or create a new customer.';
  const received = nairaToKobo(input.received);
  if (received === null) return 'Enter a valid amount with no more than two decimal places.';
  if (BigInt(received) > BigInt(input.total)) return 'Payment cannot exceed this invoice total.';
  if (BigInt(received) > BigInt(0) && !['cash', 'pos', 'transfer'].includes(input.method ?? '')) return 'Choose how this payment was received.';
  if (BigInt(received) < BigInt(input.total) && !input.phone.trim()) return 'A phone number is required while a balance remains.';
  return null;
}
