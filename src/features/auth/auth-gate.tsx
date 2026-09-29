import { createContext, type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import type { Session } from '@supabase/supabase-js';

import { Page } from '@/components/ui/page';
import { supabase } from '@/services/supabase/client';

import { type AccessProfile, classifyProfileResult, keepProfileForSession, resolveAccess } from './access-policy';

type Profile = AccessProfile;
export const AuthProfile = createContext<Profile | null>(null);

export function AuthGate({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Mirror of `profile` readable synchronously inside auth callbacks and async checks.
  const verified = useRef<Profile | null>(null);
  // `loading` blocks the screen only before the first verified profile of a session.
  const [loading, setLoading] = useState(!!supabase);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      // Same user re-emitted (SIGNED_IN on tab focus, TOKEN_REFRESHED): keep the workspace mounted.
      const keep = keepProfileForSession(verified.current, next?.user.id ?? null);
      setSession(next);
      if (!keep) { verified.current = null; setProfile(null); setLoading(!!next); }
    });
    const refresh = (state: string) => {
      if (state === 'active') { client.auth.startAutoRefresh(); setRevision(value => value + 1); }
      else client.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    return () => { data.subscription.unsubscribe(); listener.remove(); client.auth.stopAutoRefresh(); };
  }, []);
  useEffect(() => {
    if (!supabase || !session) return;
    let cancelled = false;
    const client = supabase;
    async function load() {
      // Verify in the background; only an unverified session shows the blocking check.
      if (!verified.current) setLoading(true);
      setError('');
      let outcome: ReturnType<typeof classifyProfileResult>;
      try {
        const { data, error: failure } = await client.from('profiles').select('id,business_id,display_name,role,active').eq('id', session!.user.id).single();
        outcome = classifyProfileResult(data, failure);
      } catch { outcome = { kind: 'unavailable' }; }
      if (cancelled) return;
      const resolved = resolveAccess(verified.current, outcome);
      verified.current = resolved.profile;
      setProfile(resolved.profile); setError(resolved.message); setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [session, revision]);
  async function signIn() {
    if (!supabase || busy) return;
    setBusy(true); setError('');
    try {
      const { error: failure } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (failure) setError('Unable to sign in. Check your details and connection.');
    } catch { setError('Unable to sign in. Please try again.'); }
    finally { setPassword(''); setBusy(false); }
  }
  if (!supabase) return <>{children}</>;
  if (loading) return <Page><ActivityIndicator accessibilityLabel="Checking access" /><Text>Checking your access…</Text></Page>;
  if (session && profile) return <AuthProfile value={profile}>{children}</AuthProfile>;
  if (session) return <Page><Text>{error}</Text><Button onPress={() => setRevision(value => value + 1)}>Retry access check</Button><Button onPress={async () => { await supabase!.auth.signOut({ scope: 'local' }); }}>Sign out</Button></Page>;
  return <Page>
    <Text variant="headlineMedium">Sign in to BOMedia</Text><Text>Use the account created by your admin.</Text>
    <TextInput label="Email" mode="outlined" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <TextInput label="Password" mode="outlined" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
    {error ? <Text accessibilityLiveRegion="polite">{error}</Text> : null}
    <Button mode="contained" loading={busy} disabled={busy || !email.trim() || !password} onPress={signIn}>Sign in</Button>
  </Page>;
}
