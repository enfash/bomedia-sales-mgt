import { useWorkspaceLayout } from '@/hooks/use-workspace-layout';
import { use, useCallback, useRef, useState, useTransition } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { FormSection } from '@/components/ui/form-section';
import { Page } from '@/components/ui/page';
import { ReviewSheet } from '@/components/ui/review-sheet';
import { ChoiceButtons } from '@/components/ui/choice-buttons';
import { CopyableAmount } from '@/components/ui/copyable-amount';
import { AuthProfile } from '@/features/auth/auth-gate';
import { openLocalRepository } from '@/services/local/database';
import type { LocalRepository, StoredOperation } from '@/services/local/repository';
import { formatNaira } from '@/features/sales/domain/money';
import { fetchPaymentContext, sendPayment } from './payment-service';
import { SharedPaymentActivity } from './shared-payment-activity';
import { reviewPayment } from './review';
import { submitPaymentAndRefresh, type PaymentPayload, type PaymentReceipt } from './submission';

export default function PaymentsScreen() {
  const profile = use(AuthProfile);
  const params = useLocalSearchParams<{ customerId?: string; saleId?: string; entry?: string }>();
  if (!profile) return null;
  return <PaymentWorkspace key={`${profile.id}:${params.customerId ?? ''}:${params.saleId ?? ''}:${params.entry ?? ''}`} accountId={profile.id} customerId={typeof params.customerId === 'string' ? params.customerId : undefined} saleId={typeof params.saleId === 'string' && params.saleId ? params.saleId : null} />;
}

function PaymentWorkspace({ accountId, customerId, saleId }: { accountId: string; customerId?: string; saleId: string | null }) {
  const { roomy } = useWorkspaceLayout();
  const [repo, setRepo] = useState<LocalRepository | null>(null);
  const [stored, setStored] = useState<StoredOperation[]>([]);
  const [ready, setReady] = useState(false);
  const [history, setHistory] = useState<'shared' | 'device'>(customerId ? 'device' : 'shared');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentPayload['method'] | null>(null);
  const [review, setReview] = useState<{ payload: PaymentPayload; allocations: ReturnType<typeof reviewPayment>['allocations'] } | null>(null);
  const [frozen, setFrozen] = useState<{ id: string; payload: PaymentPayload } | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [error, setError] = useState('');
  const [busy, startTransition] = useTransition();
  const lock = useRef(false);
  const [id] = useState(randomUUID);
  const [deviceId, setDeviceId] = useState('');
  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const repository = await openLocalRepository(accountId);
        const device = await repository.loadDraft('device');
        const deviceValue = device ? JSON.parse(device.payload) as string : randomUUID();
        if (!device) await repository.saveDraft('device', JSON.stringify(deviceValue));
        setDeviceId(deviceValue);
        const operations = await repository.payments();
        setRepo(repository); setStored(operations); setReady(true);
      } catch { setError('Unable to open payment recovery. Do not record another copy; retry opening this page.'); }
    });
  }, [accountId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const pending = stored.filter(row => row.status !== 'confirmed');

  async function prepare() {
    if (lock.current || !customerId) return;
    lock.current = true;
    startTransition(async () => {
      try {
        setError('');
        const context = await fetchPaymentContext(customerId, saleId);
        const calculated = reviewPayment(context, amount, method);
        setReview({ allocations: calculated.allocations, payload: {
          kind: 'payment', version: 1, scope: saleId ? 'invoice' : 'customer', customerId, customerName: context.customerName,
          saleId, amountKobo: calculated.kobo, method: method!, deviceId, occurredAt: new Date().toISOString(),
        } });
      } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to review payment.'); }
      finally { lock.current = false; }
    });
  }
  function submit(operation: { id: string; payload: PaymentPayload }) {
    if (!repo || lock.current) return;
    lock.current = true;
    setFrozen(operation); setReview(null); setReceipt(null);
    startTransition(async () => {
      try {
        setError('');
        const result = await submitPaymentAndRefresh(repo, operation.id, operation.payload, sendPayment);
        setReceipt(result.receipt);
        if (result.operations) setStored(result.operations);
        else setError('Payment confirmed and saved. The saved-payments list could not refresh; refresh the list when available.');
      } catch (failure) {
        setError(`${failure instanceof Error ? failure.message : 'Confirmation unavailable.'} Keep this payment and retry it; do not enter it again.`);
        try { setStored(await repo.payments()); } catch { /* Keep the frozen operation visible for retry. */ }
      } finally { lock.current = false; }
    });
  }
  return <>
    <Page workspace={roomy}>
      <Text>Record money received and check confirmed business collections.</Text>
      {error ? <Text accessibilityLiveRegion="assertive">{error}</Text> : null}
      {!ready ? <Button loading={busy} onPress={refresh}>Open payment recovery</Button> : null}
      {customerId && ready && !frozen && pending.length === 0 ? <FormSection step="01" title="Payment received">
        <Text variant="titleMedium">{saleId ? 'Pay this invoice only' : 'Pay customer debt · oldest first'}</Text>
        <TextInput label="Amount received (₦)" mode="outlined" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} disabled={busy} />
        <ChoiceButtons label="Payment method" options={[{ value: 'cash', label: 'Cash' }, { value: 'pos', label: 'POS' }, { value: 'transfer', label: 'Transfer' }]} value={method} onChange={value => { if (!busy) setMethod(value); }} />
        <Button mode="contained" loading={busy} disabled={busy} onPress={prepare}>Review payment</Button>
      </FormSection> : null}
      {!customerId ? <Text>Open a customer’s Pay debt action or an invoice to record a new payment.</Text> : null}
      {pending.length ? <Text>Resolve saved payments in This device before starting another payment on this device.</Text> : null}
      {frozen && !receipt ? <Card mode="outlined"><Card.Content>
        <Text variant="titleMedium">Awaiting confirmation</Text>
        <Text>{frozen.payload.customerName ?? frozen.payload.customerId}</Text>
        <CopyableAmount label="Amount received" kobo={frozen.payload.amountKobo} />
        <Button loading={busy} disabled={busy} onPress={() => submit(frozen)}>Retry this payment</Button>
      </Card.Content></Card> : null}
      {receipt ? <ReceiptDetails receipt={receipt} /> : null}
      <ChoiceButtons label="Payment history" value={history} onChange={setHistory} options={[{ value: 'shared', label: 'Shared activity' }, { value: 'device', label: 'This device' }]} />
      {history === 'shared' ? <SharedPaymentActivity revision={receipt?.paymentId ?? ''} /> : <>
      <Text variant="titleMedium">Saved payments · this account and device</Text>
      <Button disabled={busy} onPress={refresh}>Refresh saved payments</Button>
      {stored.map(row => {
        const payload = JSON.parse(row.payload) as PaymentPayload;
        return <Card key={row.operation_id} mode="outlined"><Card.Content>
          <Text variant="titleMedium">{payload.customerName ?? payload.customerId}</Text>
          <Text>{formatNaira(payload.amountKobo)} · {payload.method} · {row.status === 'confirmed' ? 'Confirmed' : 'Awaiting confirmation'}</Text>
          <Text>{new Date(payload.occurredAt).toLocaleString()} · {payload.scope === 'invoice' ? 'Invoice only' : 'Oldest debt first'}</Text>
          <Button disabled={busy} onPress={() => {
            if (row.status === 'confirmed' && row.result) setReceipt(JSON.parse(row.result));
            else submit({ id: row.operation_id.slice('payment:'.length), payload });
          }}>{row.status === 'confirmed' ? 'View receipt' : 'Retry saved payment'}</Button>
        </Card.Content></Card>;
      })}
      </>}
    </Page>
    <ReviewSheet visible={!!review} title="Review payment" onClose={() => setReview(null)}>
      {review ? <>
        <Text variant="titleLarge">{review.payload.customerName}</Text>
        <CopyableAmount label="Amount received" kobo={review.payload.amountKobo} />
        <Text>Method: {review.payload.method.toUpperCase()}</Text>
        <Text>{saleId ? 'Applied only to this invoice.' : 'Applied to the oldest unpaid invoices first.'}</Text>
        {review.allocations.map(item => <Card key={item.saleId} mode="outlined"><Card.Content>
          <Text>Invoice #{item.invoiceNumber}</Text><CopyableAmount label="To apply" kobo={item.amountKobo} />
        </Card.Content></Card>)}
        <Text>Balances are checked again when saved. If another payment arrives first, excess money stays recorded for admin review.</Text>
        <Button mode="contained" disabled={busy} onPress={() => submit({ id, payload: review.payload })}>Confirm payment received</Button>
      </> : null}
    </ReviewSheet>
  </>;
}

function ReceiptDetails({ receipt }: { receipt: PaymentReceipt }) {
  return <Card mode="outlined"><Card.Content>
    <Text variant="titleLarge">Payment confirmed</Text>
    <Text selectable>Receipt {receipt.paymentId}</Text>
    <CopyableAmount label="Received" kobo={receipt.amountKobo} />
    <Text>{receipt.method.toUpperCase()} · Collected by {receipt.collectedByName}</Text>
    <Text selectable>{receipt.businessDate} · {new Date(receipt.occurredAt).toLocaleTimeString()}</Text>
    {receipt.allocations.map(item => <Text key={item.saleId}>Invoice #{item.invoiceNumber}: {formatNaira(item.amountKobo)}</Text>)}
    {BigInt(receipt.unappliedKobo) > 0n ? <><CopyableAmount label="Unapplied · admin review required" kobo={receipt.unappliedKobo} /><Text>The full money received is saved. Ask your admin to resolve this amount; do not record it again.</Text></> : null}
    {receipt.reviewFlags.length ? <Text>Flagged for admin review.</Text> : null}
  </Card.Content></Card>;
}
