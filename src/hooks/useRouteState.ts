import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteStateOptions {
  key: string; // Unique key for this route state
  persistScroll?: boolean; // Whether to persist scroll position
}

interface StoredRouteState<T> {
  data: T;
  scrollPosition: number;
  timestamp: number;
}

const ROUTE_STATE_PREFIX = 'routeState:';
const SESSION_STORAGE = true; // Use sessionStorage for route state (cleared on tab close)

function getStorage() {
  return SESSION_STORAGE ? sessionStorage : localStorage;
}

export function useRouteState<T extends Record<string, any>>(
  initialState: T,
  options: RouteStateOptions
) {
  const location = useLocation();
  const { key, persistScroll = true } = options;
  
  const [state, setState] = useState<T>(() => {
    // Try to restore state on mount
    try {
      const storageKey = `${ROUTE_STATE_PREFIX}${key}:${location.pathname}`;
      const stored = getStorage().getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredRouteState<T>;
        return parsed.data;
      }
    } catch (error) {
      console.error('Error restoring route state:', error);
    }
    return initialState;
  });
  
  const scrollRestoredRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  
  // Restore scroll position on mount
  useEffect(() => {
    if (persistScroll && !scrollRestoredRef.current) {
      try {
        const storageKey = `${ROUTE_STATE_PREFIX}${key}:${location.pathname}`;
        const stored = getStorage().getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as StoredRouteState<T>;
          if (parsed.scrollPosition > 0) {
            // Delay scroll restoration to allow DOM to render
            setTimeout(() => {
              window.scrollTo({ top: parsed.scrollPosition, behavior: 'auto' });
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error restoring scroll position:', error);
      }
      scrollRestoredRef.current = true;
    }
  }, [key, location.pathname, persistScroll]);

  // Save state and scroll position before leaving
  const saveState = useCallback(() => {
    try {
      const storageKey = `${ROUTE_STATE_PREFIX}${key}:${location.pathname}`;
      const stateToSave: StoredRouteState<T> = {
        data: stateRef.current,
        scrollPosition: window.scrollY,
        timestamp: Date.now(),
      };
      getStorage().setItem(storageKey, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving route state:', error);
    }
  }, [key, location.pathname]);

  // IMPORTANT:
  // - Avoid beforeunload handlers here because they often disable the browser's back/forward cache (bfcache)
  //   which makes pages feel like they "refresh" when the user leaves and comes back.
  // - pagehide/visibilitychange keep bfcache working while still letting us persist state.
  useEffect(() => {
    const handlePageHide = () => saveState();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveState();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      saveState();
    };
  }, [saveState]);
  
  // Update state with automatic save
  const updateState = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setState(prev => {
      const newState = typeof updates === 'function' 
        ? updates(prev) 
        : { ...prev, ...updates };
      return newState;
    });
  }, []);
  
  // Clear state for this route
  const clearState = useCallback(() => {
    try {
      const storageKey = `${ROUTE_STATE_PREFIX}${key}:${location.pathname}`;
      getStorage().removeItem(storageKey);
      setState(initialState);
    } catch (error) {
      console.error('Error clearing route state:', error);
    }
  }, [key, location.pathname, initialState]);
  
  return {
    state,
    setState: updateState,
    clearState,
    saveState,
  };
}

// Clear all route states (useful on logout)
export function clearAllRouteStates() {
  const storage = getStorage();
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(ROUTE_STATE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => storage.removeItem(key));
  return keysToRemove.length;
}
