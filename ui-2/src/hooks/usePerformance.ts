/**
 * Production-grade Performance Hooks
 * Custom React hooks for performance optimization
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce, throttle, apiCache, cachedFetch } from '../utils/performance';

/**
 * Debounced state hook
 * Returns debounced value that only updates after delay
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced callback hook
 * Returns a debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => debounce((...args: Parameters<T>) => callbackRef.current(...args), delay) as T,
    [delay, ...deps]
  );
}

/**
 * Throttled callback hook
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () => throttle((...args: Parameters<T>) => callbackRef.current(...args), delay) as T,
    [delay, ...deps]
  );
}

/**
 * Async data fetching hook with caching
 */
interface UseAsyncDataOptions<T> {
  cacheKey?: string;
  cacheTtl?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  refetchInterval?: number;
}

interface UseAsyncDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
}

export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataResult<T> {
  const {
    cacheKey,
    cacheTtl = 30000,
    enabled = true,
    onSuccess,
    onError,
    refetchInterval,
  } = options;

  const [data, setData] = useState<T | null>(() => {
    // Initialize from cache if available
    if (cacheKey) {
      return apiCache.get<T>(cacheKey);
    }
    return null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const fetch = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      let result: T;

      if (cacheKey) {
        result = await cachedFetch(cacheKey, () => fetchFnRef.current(), cacheTtl);
      } else {
        result = await fetchFnRef.current();
      }

      if (mountedRef.current) {
        setData(result);
        onSuccess?.(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, cacheTtl, onSuccess, onError]);

  const invalidate = useCallback(() => {
    if (cacheKey) {
      apiCache.delete(cacheKey);
    }
    setData(null);
  }, [cacheKey]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      fetch();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [enabled, fetch]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const intervalId = setInterval(fetch, refetchInterval);
    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, fetch]);

  return { data, loading, error, refetch: fetch, invalidate };
}

/**
 * Intersection observer hook for lazy loading
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefObject<HTMLDivElement>, boolean] {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '100px', threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return [elementRef, isVisible];
}

/**
 * Previous value hook
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/**
 * Mount state hook
 */
export function useIsMounted(): () => boolean {
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}

/**
 * Local storage hook with sync
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(newValue));
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
        return newValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

/**
 * Window size hook
 */
export function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = throttle(() => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }, 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * Keyboard shortcut hook
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean; enabled?: boolean } = {}
): void {
  const { ctrl = false, shift = false, alt = false, enabled = true } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === ctrl &&
        e.shiftKey === shift &&
        e.altKey === alt
      ) {
        e.preventDefault();
        callbackRef.current();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, ctrl, shift, alt, enabled]);
}
