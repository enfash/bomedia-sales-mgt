import { createClient } from '@supabase/supabase-js';

import { sessionStorage } from './session-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Missing configuration leaves the sales workspace unavailable.
export const supabase = url && key ? createClient(url, key, {
  auth: { storage: sessionStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
}) : null;
