import { supabase } from '@/services/supabase/client';
import { decimalNaira } from './domain/money';

export type Customer = { id: string; name: string; phone: string };
export type Material = { value: string; label: string; rate: string; priceVersionId: string };
export type SalesRules = { version: number; minimumKobo: string; roundingKobo: string };
export type Catalog = { materials: Material[]; rules: SalesRules };

export async function loadCatalog(): Promise<Catalog> {
  if (!supabase) throw new Error('Sign in to load materials.');
  const [materialResult, rulesResult] = await Promise.all([
    supabase.from('materials').select('id,name,price_versions(id,rate_kobo,effective_at)').eq('active', true).order('name'),
    supabase.from('sales_rules').select('version,minimum_kobo,rounding_kobo').single(),
  ]);
  if (materialResult.error || rulesResult.error) throw new Error('Unable to load materials and prices. Check your connection and retry.');
  const materials = materialResult.data.flatMap(m => {
    const price = m.price_versions.filter(p => Date.parse(p.effective_at) <= Date.now())
      .sort((a, b) => b.effective_at.localeCompare(a.effective_at) || b.id.localeCompare(a.id))[0];
    if (!price || !Number.isSafeInteger(price.rate_kobo)) return [];
    return [{ value: m.id, label: m.name, rate: decimalNaira(String(price.rate_kobo)), priceVersionId: price.id }];
  });
  const r = rulesResult.data;
  if (!Number.isSafeInteger(r.minimum_kobo) || !Number.isSafeInteger(r.rounding_kobo)) throw new Error('Sales rules are invalid. Contact your admin.');
  return { materials, rules: { version: r.version, minimumKobo: String(r.minimum_kobo), roundingKobo: String(r.rounding_kobo) } };
}
export async function searchCustomers(query: string, signal: AbortSignal): Promise<Customer[]> {
  if (!supabase) return [];
  // Search each field separately to avoid interpolating user text into PostgREST filter syntax.
  const escaped = query.trim().replace(/[\\%_]/g, '\\$&');
  const [names, phones] = await Promise.all(['name', 'phone'].map(field => supabase!.from('customers')
    .select('id,name,phone').ilike(field, `%${escaped}%`).order('name').order('id').limit(20).abortSignal(signal)));
  if (names.error || phones.error) throw new Error('Customer search failed. Retry before creating a customer.');
  return [...new Map([...names.data, ...phones.data].map(c => [c.id, { ...c, phone: c.phone ?? '' }])).values()].slice(0, 20);
}
