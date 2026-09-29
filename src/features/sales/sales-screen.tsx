import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { use, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, Platform, View } from 'react-native';
import { ActivityIndicator, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { ActionButton as Button } from '@/components/ui/action-button';
import { StatusChip } from '@/components/ui/status-chip';
import { useTopbarStatus } from '@/components/layout/app-shell';
import { ItemCalculation } from './components/item-calculation';
import { InvoiceActionBar } from './components/invoice-action-bar';
import { randomUUID } from 'expo-crypto';

import { FormSection } from '@/components/ui/form-section';
import { StatusNote } from '@/components/ui/status-note';
import { StepperField } from '@/components/ui/stepper-field';
import { InvoiceItem } from './components/invoice-item';
import { InvoiceTotals } from './components/invoice-totals';
import { ChoiceButtons } from '@/components/ui/choice-buttons';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { Page } from '@/components/ui/page';
import { ReviewSheet } from '@/components/ui/review-sheet';
import { AuthProfile } from '@/features/auth/auth-gate';
import { openLocalRepository } from '@/services/local/database';
import type { LocalRepository } from '@/services/local/repository';
import { tokens } from '@/theme/tokens';
import { CustomerPicker, type CustomerDraft } from './components/customer-picker';
import { loadCatalog, type Catalog, type Material } from './catalog';
import { formatNaira, nairaToKobo, paymentError } from './domain/money';
import { calculateItem, formatItemArea, invoiceTotal, type MeasurementUnit, type PaymentMethod } from './domain/pricing';
import { SaleReviewRequired, sendSale } from './sale-service';
import { loadLastConfirmedSale, saveNextSaleDraft, submitDurably, type SalePayload, type SaleReceipt } from './submission';

const units = [{ value: 'ft', label: 'FEET' }, { value: 'in', label: 'INCHES' }] as const;
const methods = [{ value: 'cash', label: 'Cash' }, { value: 'pos', label: 'POS' }, { value: 'transfer', label: 'Transfer' }] as const;
type Item = { id: string; material: Material; width: string; height: string; quantity: string; unit: MeasurementUnit; calculation: ReturnType<typeof calculateItem> };
type Draft = {
  version: 1; id: string; customer: CustomerDraft; unit: MeasurementUnit; materialId: string;
  width: string; height: string; quantity: string; items: Item[]; editing: string | null;
  received: string; method: PaymentMethod | null; payload: SalePayload | null; catalog: Catalog;
};
type Ready = { repo: LocalRepository; draft: Draft; deviceId: string; cached: boolean; receipt: SaleReceipt | null; lastConfirmed: SaleReceipt | null };
// A draft nobody has started filling in: the last confirmed invoice note is still relevant to it.
function isUntouched(draft: Draft) {
  return !draft.payload && draft.items.length === 0 && !draft.customer.name.trim() && !draft.customer.phone.trim() && !draft.width.trim() && !draft.height.trim();
}
function confirmedNote(receipt: SaleReceipt) {
  return `Invoice #${receipt.invoiceNumber} saved${receipt.reviewFlags.length ? ' · Flagged for admin review' : ''}. Ready for a new sale.`;
}
function newDraft(catalog: Catalog): Draft & { payload: null } {
  // No material is preselected: the first catalogue entry is alphabetical, not the
  // everyday one, and starting on someone else's rate silently mis-prices the item.
  return { version: 1, id: randomUUID(), customer: { id: null, name: '', phone: '', selected: false }, unit: 'ft', materialId: '', width: '', height: '', quantity: '1', items: [], editing: null, received: '0', method: null, payload: null, catalog };
}
export default function SalesScreen() {
  const profile = use(AuthProfile);
  const [ready, setReady] = useState<Ready | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    async function load() {
      try {
        const repo = await openLocalRepository(profile!.id);
        const saved = await repo.loadDraft('current-sale');
        const draft = saved ? JSON.parse(saved.payload) as Draft : null;
        if (draft && draft.version !== 1) throw new Error('This saved draft requires a newer app.');
        let catalog: Catalog; let cached = false;
        try { catalog = await loadCatalog(); await repo.saveDraft('catalog', JSON.stringify(catalog)); }
        catch (failure) {
          const backup = await repo.loadDraft('catalog');
          if (Platform.OS === 'web' || !backup) throw failure;
          catalog = JSON.parse(backup.payload); cached = true;
        }
        const device = await repo.loadDraft('device');
        const deviceId = device ? JSON.parse(device.payload) as string : randomUUID();
        if (!device) await repo.saveDraft('device', JSON.stringify(deviceId));
        let current = draft ?? newDraft(catalog);
        if (!draft) await repo.saveDraft('current-sale', JSON.stringify(current));
        // A crash between queueing and saving the frozen UI state must never unlock that submission.
        const operation = await repo.operation(current.id);
        if (operation) current.payload = JSON.parse(operation.payload);
        let receipt = operation?.status === 'confirmed' && operation.result ? JSON.parse(operation.result) as SaleReceipt : null;
        if (receipt) {
          const next = newDraft(catalog);
          await saveNextSaleDraft(repo, current.id, next);
          current = next; receipt = null;
        }
        // Feedback only: the confirmation note comes from durable storage so it survives remounts.
        const lastConfirmed = isUntouched(current) ? (await loadLastConfirmedSale(repo))?.receipt ?? null : null;
        if (!cancelled) setReady({ repo, draft: current, deviceId, cached, receipt, lastConfirmed });
      } catch (failure) { if (!cancelled) setError(failure instanceof Error ? failure.message : 'Unable to open your sales workspace. Retry.'); }
    }
    void load();
    return () => { cancelled = true; };
  }, [profile, revision]);
  if (!profile) return <Page><Text>Connect Supabase and sign in to start recording sales.</Text></Page>;
  if (!ready) return <Page>{error ? <><Text>{error}</Text><Button onPress={() => { setError(''); setRevision(n => n + 1); }}>Retry</Button></> : <><ActivityIndicator /><Text>Opening your sales workspace…</Text></>}</Page>;
  return <SaleForm key={profile.id} initial={ready} />;
}
function SaleForm({ initial }: { initial: Ready }) {
  const { wide, roomy, desktop } = useWorkspaceLayout();
  const { repo, deviceId } = initial;
  const theme = useTheme();
  const [draft, setDraft] = useState(initial.draft);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(initial.receipt);
  const [sheet, setSheet] = useState<'payment' | 'invoice' | null>(initial.draft.payload ? 'invoice' : null);
  const [busy, setBusy] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(initial.lastConfirmed ? confirmedNote(initial.lastConfirmed) : '');
  const [saveStatus, setSaveStatus] = useState('Draft saved on this device');
  const queue = useRef(Promise.resolve());
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { customer, unit, materialId, width, height, quantity, items, editing, received, method, catalog } = draft;
  const material = catalog.materials.find(m => m.value === materialId);
  const frozen = !!draft.payload;
  let calculation: ReturnType<typeof calculateItem> | null = null;
  try { if (material) calculation = calculateItem({ width, height, quantity, unit, rateNaira: material.rate, roundingKobo: catalog.rules.roundingKobo }); } catch { /* Incomplete form input. */ }
  const totals = items.length ? invoiceTotal(items.map(i => i.calculation.chargedKobo), catalog.rules.minimumKobo) : null;
  // A running total from an empty invoice is zero, not absent: the rail shows the
  // same three lines throughout so the figure a person watches never moves or appears.
  const runningTotals = totals ?? { subtotalKobo: '0', adjustmentKobo: '0', totalKobo: '0' };
  const error = paymentError({ total: totals?.totalKobo ?? '0', received, method, phone: customer.phone, customerSelected: customer.selected && !!customer.name.trim() });
  const payment = nairaToKobo(received);
  const balance = totals && payment !== null && BigInt(payment) <= BigInt(totals.totalKobo) ? (BigInt(totals.totalKobo) - BigInt(payment)).toString() : null;
  // Rates ride along with the choice; a rate shown elsewhere is read after the decision, not during it.
  const materialOptions = catalog.materials.map(m => ({ value: m.value, label: m.label, caption: `${formatNaira(nairaToKobo(m.rate)!).replace(/\.00$/, '')} / sq ft` }));
  // A blocked action names what is missing; a control that is merely dim teaches nothing.
  const itemBlocker = !catalog.materials.length ? 'No materials are available to price this item.'
    : !material ? 'Choose a material to price this item.'
    : !calculation ? 'Enter a width, height and quantity to see the charge.'
    : editing === null && items.length >= 200 ? 'This invoice already holds 200 items.'
    : '';
  const reviewBlocker = editing !== null ? 'Finish editing the item above, then review the sale.'
    : !totals ? 'Add at least one item before reviewing this sale.'
    : '';
  const contentStyle = { gap: tokens.spacing.medium };
  const draftChip = {
    label: frozen ? receipt ? 'Sale confirmed' : 'Awaiting confirmation · Kept on this device' : saveStatus,
    tone: saveStatus.startsWith('Draft could not') || (frozen && !receipt) ? 'caution' as const : 'neutral' as const,
  };
  // Desktop folds draft status into the topbar beside the environment marker; phones keep it in the page.
  useTopbarStatus('/', desktop ? draftChip : null);
  function persist(next: Draft) {
    setDraft(next); setSaveStatus('Saving draft…');
    const write = queue.current.catch(() => {}).then(() => repo.saveDraft('current-sale', JSON.stringify(next)));
    queue.current = write;
    void write.then(() => { if (mounted.current && queue.current === write) setSaveStatus('Draft saved on this device'); })
      .catch(() => { if (mounted.current) setSaveStatus('Draft could not be saved. Keep this screen open and retry.'); });
  }
  function update(patch: Partial<Draft>) {
    if (frozen || lock.current) return;
    if (success) setSuccess('');
    persist({ ...draft, ...patch });
  }
  function stepQuantity(delta: number) {
    const current = Number.parseInt(quantity, 10);
    const base = Number.isFinite(current) && current > 0 ? current : 1;
    update({ quantity: String(Math.max(1, base + delta)) });
  }
  function addItem() {
    if (!calculation || !material) return;
    const item = { id: editing ?? randomUUID(), material, width: width.trim(), height: height.trim(), quantity, unit, calculation };
    update({ items: editing === null ? [...items, item] : items.map(i => i.id === editing ? item : i), editing: null, width: '', height: '', quantity: '1' });
  }
  async function openBlankSale(confirmed: SaleReceipt) {
    try {
      setMessage('Sale saved. Opening a blank sale…');
      const fresh = await loadCatalog();
      await repo.saveDraft('catalog', JSON.stringify(fresh));
      const next = newDraft(fresh);
      await queue.current.catch(() => {});
      await saveNextSaleDraft(repo, draft.id, next);
      if (!mounted.current) return;
      setDraft(next); setReceipt(null); setNeedsReview(false); setSheet(null); setMessage('');
      setSaveStatus('Draft saved on this device');
      setSuccess(confirmedNote(confirmed));
    } catch {
      if (mounted.current) setMessage('Your sale is saved. Could not open the next form. Check your connection and device storage, then retry opening a blank sale. Do not submit this invoice again.');
    }
  }
  async function submit() {
    if (lock.current || receipt || !totals || error) return;
    lock.current = true; setBusy(true); setMessage('');
    const payload = draft.payload ?? {
      version: 1, rulesVersion: catalog.rules.version, deviceId, occurredAt: new Date().toISOString(),
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
      items: items.map(i => ({ materialId: i.material.value, priceVersionId: i.material.priceVersionId, width: i.width, height: i.height, quantity: i.quantity, unit: i.unit })),
      totalKobo: totals.totalKobo, receivedKobo: payment!, method,
    } satisfies SalePayload;
    try {
      // Persist the frozen payload before any network call. Form edits cannot change a retry.
      const next = { ...draft, payload };
      persist(next); await queue.current;
      const result = await submitDurably(repo, draft.id, payload, sendSale);
      if (mounted.current) {
        setReceipt(result); setSheet(null);
        await openBlankSale(result);
      }
    } catch (failure) {
      if (mounted.current) {
        setNeedsReview(failure instanceof SaleReviewRequired);
        setMessage(failure instanceof Error ? failure.message : 'Confirmation unavailable. Keep this submission and retry.');
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  // Pending submissions retry on foreground and periodically while this screen is active.
  useEffect(() => {
    if (!draft.payload || receipt || needsReview) return;
    const retry = () => { if (AppState.currentState === 'active' && !lock.current) void submit(); };
    const timer = setInterval(retry, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') retry(); });
    return () => { clearInterval(timer); listener.remove(); };
  });
  async function startNext() {
    if (lock.current || !receipt) return;
    lock.current = true; setBusy(true);
    try { await openBlankSale(receipt); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <>
    <Page key={draft.id} workspace={roomy} footer={!roomy && !frozen ? <InvoiceActionBar count={items.length} totalKobo={runningTotals.totalKobo} blocker={reviewBlocker} onReview={() => { Keyboard.dismiss(); setSheet('payment'); }} /> : undefined}>
      {!desktop ? <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.small }}>
        <StatusChip {...draftChip} />
        <StatusChip label="Development" />
      </View> : null}
      {success && !frozen ? <StatusNote message={success} /> : null}
      {initial.cached ? <StatusNote message="Using saved prices. Customer search needs a connection; submissions stay pending until confirmed." /> : null}
      {frozen ? <Card mode="outlined"><Card.Content style={contentStyle}>
        <Text variant="titleMedium">{receipt ? `Invoice #${receipt.invoiceNumber} saved` : 'Submission kept on this device'}</Text>
        <Text>{customer.name} · {items.length} items · {formatNaira(totals?.totalKobo ?? '0')}</Text>
        <Button mode="contained" onPress={() => setSheet('invoice')}>View invoice</Button>
        {receipt ? <Button loading={busy} disabled={busy} onPress={startNext}>Retry opening blank sale</Button> : <Button loading={busy} disabled={busy} onPress={submit}>Retry same submission</Button>}
        {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
      </Card.Content></Card> : <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'flex-start', gap: tokens.spacing.large }}>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0, gap: tokens.spacing.large }}>
        <FormSection step="01" title="Customer" description="Find a returning customer or add someone new." trailing={customer.selected ? <StatusChip icon="check" tone="settled" label={customer.id ? 'Existing customer' : 'New customer'} /> : undefined}>
          <CustomerPicker value={customer} onChange={value => update({ customer: value })} />
        </FormSection>
        <FormSection step="02" title={editing === null ? 'Printing details' : 'Edit printing item'} description="Enter the dimensions you want to bill.">
          {catalog.materials.length ? <ChoiceButtons label="Material" layout="card" options={materialOptions} value={materialId} onChange={value => update({ materialId: value })} /> : <Text>No active materials with prices. Contact your admin.</Text>}
          {catalog.materials.length ? <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Rates are per square foot and are set by your admin.</Text> : null}
          <ChoiceButtons label="Measurement unit" options={units} value={unit} onChange={value => update({ unit: value })} compact />
          {/* One row: the three numbers that make an item belong together. The unit rides in
              each label so the FEET/INCHES choice is visible while typing, and the × between
              the fields states the arithmetic — width × height × quantity is the charge. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.spacing.small / 2 }}>
            <TextInput style={{ flex: 1, minWidth: tokens.layout.dimensionMinWidth }} mode="outlined" label={`Width (${unit})`} value={width} onChangeText={value => update({ width: value })} keyboardType="decimal-pad" />
            <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: tokens.spacing.tiny }}>×</Text>
            <TextInput style={{ flex: 1, minWidth: tokens.layout.dimensionMinWidth }} mode="outlined" label={`Height (${unit})`} value={height} onChangeText={value => update({ height: value })} keyboardType="decimal-pad" />
            <StepperField
              label="Qty" disabled={frozen}
              value={quantity} onChangeText={value => update({ quantity: value })}
              onStep={stepQuantity} canDecrease={(Number.parseInt(quantity, 10) || 1) > 1}
              accessibilityHints={{ decrease: 'Reduce quantity by one', increase: 'Increase quantity by one' }}
            />
          </View>
          {calculation ? <ItemCalculation area={formatItemArea({ width, height, quantity, unit })} calculatedKobo={calculation.calculatedKobo} chargedKobo={calculation.chargedKobo} roundingKobo={catalog.rules.roundingKobo} action={<Button mode="contained-tonal" disabled={!!itemBlocker} onPress={addItem}>{editing === null ? 'Add item' : 'Update item'}</Button>} /> : <Button mode="contained-tonal" disabled={!!itemBlocker} onPress={addItem}>{editing === null ? 'Add item to invoice' : 'Update item'}</Button>}
          {itemBlocker ? <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>{itemBlocker}</Text> : null}
        </FormSection>
        </View>
        <View style={{ width: wide ? tokens.invoice.railWidth : '100%', minWidth: 0 }}>
        <FormSection step="03" title="Your invoice" trailing={<Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>}>
          {items.map((item, index) => <InvoiceItem key={item.id} position={index + 1} material={item.material.label} width={item.width} height={item.height} unit={item.unit} quantity={item.quantity} calculatedKobo={item.calculation.calculatedKobo} chargedKobo={item.calculation.chargedKobo}
            onEdit={() => update({ editing: item.id, materialId: item.material.value, width: item.width, height: item.height, quantity: item.quantity, unit: item.unit })}
            onRemove={() => update({ items: items.filter(i => i.id !== item.id), editing: editing === item.id ? null : editing })} />)}
          {!items.length ? <View style={{ paddingVertical: tokens.spacing.medium, gap: tokens.spacing.small / 2, alignItems: 'center' }}><Text variant="titleMedium">Your invoice starts here</Text><Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>Add your first printing item above. Different sizes and materials stay on one invoice.</Text></View> : null}
          <InvoiceTotals {...runningTotals} />
          {roomy ? <Button mode="contained" disabled={!!reviewBlocker} onPress={() => { Keyboard.dismiss(); setSheet('payment'); }}>Review sale</Button> : null}
          <Text variant="bodySmall" accessibilityLiveRegion="polite" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>{reviewBlocker || 'Check the payment and full invoice before submitting.'}</Text>
          {saveStatus.startsWith('Draft could not') ? <Button onPress={() => persist(draft)}>Retry draft save</Button> : null}
        </FormSection>
        </View>
      </View>}
    </Page>
    <ReviewSheet visible={sheet !== null} title={sheet === 'invoice' ? receipt ? `Invoice #${receipt.invoiceNumber}` : 'Review invoice' : 'Review & payment'} onClose={() => setSheet(null)}>
      {sheet === 'payment' && !frozen ? <>
        <Text selectable>{customer.name || 'No customer selected'} · {items.length} items</Text><CopyableAmount label="Invoice total" kobo={totals?.totalKobo ?? '0'} emphasis />
        <TextInput label="Amount received (₦)" mode="outlined" value={received} keyboardType="decimal-pad" onChangeText={value => update({ received: value, method: nairaToKobo(value) === '0' ? null : method })} />
        {payment !== null && BigInt(payment) > BigInt(0) ? <ChoiceButtons label="Payment method · Required" options={methods} value={method} onChange={value => update({ method: value })} /> : null}
        <TextInput label="Customer phone" mode="outlined" maxLength={50} value={customer.phone} keyboardType="phone-pad" onChangeText={phone => update({ customer: { ...customer, phone } })} />
        {balance !== null ? <CopyableAmount label="Remaining balance" kobo={balance} /> : null}
        {error ? <StatusNote message={error} attention /> : null}
        <Button mode="contained" disabled={!!error || !totals} onPress={() => { Keyboard.dismiss(); setSheet('invoice'); }}>Preview invoice</Button>
      </> : <>
        <Text selectable variant="titleMedium">{customer.name}</Text><Text selectable>{customer.phone || 'No phone supplied'}</Text>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>{items.length} printing {items.length === 1 ? 'item' : 'items'} · Tap an amount to copy</Text>
        {items.map((item, index) => <InvoiceItem key={item.id} position={index + 1} material={item.material.label} width={item.width} height={item.height} unit={item.unit} quantity={item.quantity} calculatedKobo={item.calculation.calculatedKobo} chargedKobo={item.calculation.chargedKobo} />)}
        {totals ? <InvoiceTotals {...totals} receivedKobo={payment ?? '0'} balanceKobo={balance ?? '0'} method={payment !== '0' ? methods.find(m => m.value === method)?.label : undefined} /> : null}
        {!frozen ? <Button onPress={() => setSheet('payment')}>Back to payment</Button> : null}
        {!receipt ? <Button mode="contained" loading={busy} disabled={busy || !!error || !totals} onPress={submit}>{frozen ? 'Retry same submission' : 'Submit sale'}</Button> : <><Text>Confirmed · Invoice #{receipt.invoiceNumber}</Text>{receipt.reviewFlags.length ? <Text>Saved with timing or price flags for admin review.</Text> : null}<Button mode="contained" loading={busy} disabled={busy} onPress={startNext}>Retry opening blank sale</Button></>}
        <Text accessibilityLiveRegion="polite">{message || (frozen ? 'Pending confirmation. Retry this submission; do not enter it again.' : 'Submit saves this invoice and its payment to your development database.')}</Text>
      </>}
    </ReviewSheet>
  </>;
}
