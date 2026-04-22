'use client';

// useVisiblePoll — refetches `fetcher` every `intervalMs` while the
// tab is visible, pauses when `document.visibilityState !== 'visible'`
// (or when `enabled` is false), and aborts in-flight requests on
// unmount or overlap via AbortController.
//
// Designed for the Tend loops poll in app/page.tsx. The fetcher is
// expected to hit `/api/loops` with `cache: 'no-cache'` so the
// browser revalidates against the ETag returned by the route. When
// nothing has changed on disk the response is a 304 with no body —
// the hook detects that and keeps the previous data.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseVisiblePollResult<T> {
  data: T | null;
  error: Error | null;
  refetch: () => void;
}

export function useVisiblePoll<T>(
  fetcher: (signal: AbortSignal) => Promise<T | null>,
  intervalMs: number = 10_000,
  enabled: boolean = true,
): UseVisiblePollResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  // Latest fetcher in a ref so the effect below doesn't re-subscribe
  // on every render (callers typically pass inline arrow functions).
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // Track the active AbortController so overlapping fetches cancel
  // their predecessors.
  const inFlightRef = useRef<AbortController | null>(null);
  // Track whether the component is still mounted so async resolves
  // don't set state on unmounted trees.
  const mountedRef = useRef(true);

  const runFetch = useCallback(async () => {
    if (inFlightRef.current) {
      inFlightRef.current.abort();
    }
    const ctrl = new AbortController();
    inFlightRef.current = ctrl;
    try {
      const result = await fetcherRef.current(ctrl.signal);
      if (!mountedRef.current || ctrl.signal.aborted) return;
      // A fetcher may return `null` to signal "no new data" (304 hit
      // or comparable) — in which case we hold onto whatever we had
      // last and leave `data` / `error` alone.
      if (result !== null) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (!mountedRef.current || ctrl.signal.aborted) return;
      if ((err as Error)?.name === 'AbortError') return;
      setError(err as Error);
    } finally {
      if (inFlightRef.current === ctrl) inFlightRef.current = null;
    }
  }, []);

  // Lifecycle + visibility + interval management.
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      return () => {
        mountedRef.current = false;
        if (inFlightRef.current) inFlightRef.current.abort();
      };
    }

    // Initial fetch on mount / enable.
    void runFetch();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          return;
        }
        void runFetch();
      }, intervalMs);
    };

    const stopInterval = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        // Resume: fire an immediate fetch so the user sees fresh
        // data the moment they return to the tab, and restart the
        // interval.
        void runFetch();
        startInterval();
      } else {
        // Pause the interval while hidden. Any in-flight request is
        // abandoned (its result may still land, but we stamp it
        // against the current state once the tab returns).
        stopInterval();
      }
    };

    startInterval();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      mountedRef.current = false;
      stopInterval();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      if (inFlightRef.current) {
        inFlightRef.current.abort();
        inFlightRef.current = null;
      }
    };
  }, [runFetch, intervalMs, enabled]);

  const refetch = useCallback(() => {
    void runFetch();
  }, [runFetch]);

  return { data, error, refetch };
}
