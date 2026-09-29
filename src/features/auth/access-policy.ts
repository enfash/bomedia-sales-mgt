import type { AppRole } from '@/theme/tokens';

export type AccessProfile = { id: string; business_id: string; display_name: string; role: AppRole; active: boolean };

// Outcome of one server profile check. `denied` is a definitive server answer (missing,
// inactive or unknown role); `unavailable` is a transport/unknown failure with no answer.
export type Verification = { kind: 'verified'; profile: AccessProfile } | { kind: 'denied' } | { kind: 'unavailable' };

export type AccessResolution = { profile: AccessProfile | null; message: string };

export const DENIED_MESSAGE = 'Your account is not active for this business. Contact your admin.';
export const UNAVAILABLE_MESSAGE = 'Access could not be verified. Check your connection and retry.';

function sameProfile(a: AccessProfile, b: AccessProfile) {
  return a.id === b.id && a.business_id === b.business_id && a.display_name === b.display_name && a.role === b.role && a.active === b.active;
}

// Classify a profiles query result without trusting the client: only an active staff/admin
// row verifies; an explicit "no row" or inactive/unknown role is a denial; anything else
// (network, timeout, unexpected error) is unavailable.
export function classifyProfileResult(data: Partial<AccessProfile> | null | undefined, failure: { code?: string } | null | undefined): Verification {
  if (failure) return failure.code === 'PGRST116' ? { kind: 'denied' } : { kind: 'unavailable' };
  if (!data || !data.id || !data.business_id || !data.active || !data.role || !['staff', 'admin'].includes(data.role)) return { kind: 'denied' };
  return { kind: 'verified', profile: { id: data.id, business_id: data.business_id, display_name: data.display_name ?? '', role: data.role, active: true } };
}

// Decide what the app should show after a check. A previously verified workspace stays mounted
// through routine re-checks (foreground, token refresh) and through transport failures: the
// server enforces every read/write anyway, so unmounting only destroys in-progress UI state.
// A definitive denial always ejects. Identity of an unchanged profile is preserved so
// consumers keyed on it do not reload.
export function resolveAccess(previous: AccessProfile | null, result: Verification): AccessResolution {
  switch (result.kind) {
    case 'verified': return { profile: previous && sameProfile(previous, result.profile) ? previous : result.profile, message: '' };
    case 'denied': return { profile: null, message: DENIED_MESSAGE };
    case 'unavailable': return previous ? { profile: previous, message: '' } : { profile: null, message: UNAVAILABLE_MESSAGE };
  }
}

// On an auth event, keep the verified profile only while the same user stays signed in.
export function keepProfileForSession(previous: AccessProfile | null, nextUserId: string | null): boolean {
  return !!previous && !!nextUserId && previous.id === nextUserId;
}
