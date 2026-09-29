export type MeasurementUnit = 'ft' | 'in';
export type PaymentMethod = 'cash' | 'pos' | 'transfer';

// Rational operands preserve the rounding threshold even for repeating inch areas.
function decimal(value: string): { numerator: bigint; denominator: bigint } {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized) || normalized.length > 40) throw new Error('Enter a positive decimal value.');
  const [whole, fraction = ''] = normalized.split('.');
  const numerator = BigInt(whole + fraction);
  if (numerator <= BigInt(0)) throw new Error('Value must be positive.');
  return { numerator, denominator: BigInt(10) ** BigInt(fraction.length) };
}
const ceilDivide = (n: bigint, d: bigint) => (n + d - BigInt(1)) / d;

type ItemSize = { width: string; height: string; quantity: string; unit: MeasurementUnit };

function itemArea(input: ItemSize) {
  const w = decimal(input.width);
  const h = decimal(input.height);
  if (!/^\d+$/.test(input.quantity) || input.quantity.length > 12 || BigInt(input.quantity) < BigInt(1)) throw new Error('Quantity must be a positive whole number.');
  if (input.unit !== 'ft' && input.unit !== 'in') throw new Error('Choose feet or inches.');
  return {
    numerator: w.numerator * h.numerator * BigInt(input.quantity),
    denominator: w.denominator * h.denominator * BigInt(input.unit === 'in' ? 144 : 1),
  };
}

/** Display only. Pricing uses the unrounded rational area below. */
export function formatItemArea(input: ItemSize) {
  const { numerator, denominator } = itemArea(input);
  const hundredths = (numerator * 200n + denominator) / (denominator * 2n);
  return `${hundredths / 100n}.${(hundredths % 100n).toString().padStart(2, '0')}`;
}

export function calculateItem(input: ItemSize & { rateNaira: string; roundingKobo?: string }) {
  const area = itemArea(input);
  const rate = decimal(input.rateNaira);
  const numerator = area.numerator * rate.numerator;
  const denominator = area.denominator * rate.denominator;
  const rounding = BigInt(input.roundingKobo ?? '1000');
  if (rounding <= BigInt(0)) throw new Error('Invalid rounding rule.');
  const chargedKobo = ceilDivide(numerator * BigInt(100), denominator * rounding) * rounding;
  // Display to kobo only after deriving the charge from exact operands.
  const calculatedKobo = (numerator * BigInt(200) + denominator) / (denominator * BigInt(2));
  return { numerator: numerator.toString(), denominator: denominator.toString(), calculatedKobo: calculatedKobo.toString(), chargedKobo: chargedKobo.toString() };
}

export function invoiceTotal(chargesKobo: readonly string[], minimumKobo = '100000') {
  if (!chargesKobo.length) throw new Error('Add at least one item.');
  const subtotal = chargesKobo.reduce((sum, charge) => {
    if (!/^\d+$/.test(charge) || BigInt(charge) <= BigInt(0)) throw new Error('Invalid item charge.');
    return sum + BigInt(charge);
  }, BigInt(0));
  const minimum = BigInt(minimumKobo);
  if (minimum <= BigInt(0)) throw new Error('Invalid minimum order.');
  const adjustment = subtotal < minimum ? minimum - subtotal : BigInt(0);
  return { subtotalKobo: subtotal.toString(), adjustmentKobo: adjustment.toString(), totalKobo: (subtotal + adjustment).toString() };
}
