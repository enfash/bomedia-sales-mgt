import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput, useTheme } from 'react-native-paper';

import { tokens } from '@/theme/tokens';
import { AdaptiveGrid } from '@/components/ui/metric-grid';
import { searchCustomers, type Customer } from '../catalog';

export type CustomerDraft = { id: string | null; name: string; phone: string; selected: boolean };
export function CustomerPicker({ value, onChange }: { value: CustomerDraft; onChange: (value: CustomerDraft) => void }) {
  const theme = useTheme();
  const [result, setResult] = useState<{ query: string; matches: Customer[]; error: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const query = value.name.trim();
  useEffect(() => {
    if (!query || value.selected) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchCustomers(query, controller.signal).then(matches => {
        if (!controller.signal.aborted) setResult({ query, matches, error: '' });
      }).catch(() => { if (!controller.signal.aborted) setResult({ query, matches: [], error: 'Search unavailable. Check your connection and retry.' }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, value.selected, revision]);
  const ready = result?.query === query;
  return <AdaptiveGrid><View style={{ gap: tokens.spacing.small }}>
    <TextInput mode="outlined" label="Find or create customer" maxLength={200} value={value.name} onChangeText={name => onChange({ name, phone: '', id: null, selected: false })} />
    {!value.selected && query ? <>
      {!ready ? <ActivityIndicator accessibilityLabel="Searching customers" /> : result.error ? <><Text>{result.error}</Text><Button onPress={() => { setResult(null); setRevision(n => n + 1); }}>Retry search</Button></> : <>
        {result.matches.map(c => <Button key={c.id} mode="outlined" onPress={() => onChange({ ...c, selected: true })}>{c.name} · {c.phone || 'No phone saved'}</Button>)}
        {result.matches.length === 20 ? <Text>Showing up to 20 matches. Enter more of the name or phone to narrow the search.</Text> : null}
        <Button onPress={() => onChange({ ...value, name: query, selected: true })}>Create new customer: {query}</Button>
      </>}
    </> : null}
    {value.selected && !value.id ? <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>This customer will be saved with the sale.</Text> : null}
    </View>
    <TextInput mode="outlined" label="Phone (required if balance remains)" maxLength={50} keyboardType="phone-pad" value={value.phone} onChangeText={phone => onChange({ ...value, phone })} />
  </AdaptiveGrid>;
}
