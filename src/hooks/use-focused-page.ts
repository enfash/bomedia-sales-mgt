import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useTransition } from 'react';
import { AppState } from 'react-native';

import { createLatestRead } from '@/services/latest-read';

type Page<T> = { items: T[]; hasMore: boolean };
type Snapshot<T> = Page<T> & { key: string; offset: number; error: string; updatedAt: string | null };

/** Read-only pages reconcile on tab focus and app foreground; they are not live balances. */
export function useFocusedPage<T>(key: string, read: (key: string, offset: number, signal: AbortSignal) => Promise<Page<T>>, debounceMs = 0) {
  const [latest] = useState(createLatestRead);
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null);
  const [loading, startTransition] = useTransition();
  const request = useCallback((offset = 0, append = false) => {
    startTransition(async () => {
      await latest.run(signal => read(key, offset, signal), page => {
        const updatedAt = new Date().toISOString();
        setSnapshot(previous => ({ ...page, key, offset, error: '',
          updatedAt: append && previous?.key === key ? previous.updatedAt : updatedAt,
          items: append && previous?.key === key ? [...previous.items, ...page.items] : page.items }));
      }, failure => {
        setSnapshot(previous => ({ key, offset: previous?.key === key ? previous.offset : 0,
          items: previous?.key === key ? previous.items : [],
          hasMore: previous?.key === key ? previous.hasMore : false,
          updatedAt: previous?.key === key ? previous.updatedAt : null,
          error: failure instanceof Error ? failure.message : 'Unable to refresh. Please retry.' }));
      });
    });
  }, [key, latest, read]);

  useFocusEffect(useCallback(() => {
    // Invalidate immediately, including while a new search is being debounced.
    latest.cancel();
    const timer = setTimeout(() => request(), debounceMs);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { clearTimeout(timer); request(); }
      else latest.cancel();
    });
    return () => { clearTimeout(timer); subscription.remove(); latest.cancel(); };
  }, [debounceMs, latest, request]));

  const visible = snapshot?.key === key ? snapshot : null;
  return {
    items: visible?.items ?? null,
    error: visible?.error ?? '',
    hasMore: visible?.hasMore ?? false,
    loading,
    updatedAt: visible?.updatedAt ?? null,
    refresh: () => request(),
    loadMore: () => request((visible?.offset ?? 0) + 20, true),
  };
}
