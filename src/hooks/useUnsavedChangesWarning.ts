import { useEffect, useRef } from 'react';

interface UseUnsavedChangesWarningOptions {
  isDirty: boolean;
  message?: string;
  onSaveDraft?: () => void;
}

/**
 * This hook automatically saves drafts when the page is hidden (tab switch, minimize, navigate away).
 * 
 * IMPORTANT: We intentionally do NOT use `beforeunload` event because:
 * - It prevents the browser's back/forward cache (bfcache) from working
 * - This causes the page to fully reload when the user returns to the tab
 * - Instead, we rely on automatic draft saving + restoration for data persistence
 */
export function useUnsavedChangesWarning({
  isDirty,
  onSaveDraft,
}: UseUnsavedChangesWarningOptions) {
  const shouldBlockRef = useRef(isDirty);
  shouldBlockRef.current = isDirty;

  const onSaveDraftRef = useRef(onSaveDraft);
  onSaveDraftRef.current = onSaveDraft;

  // Save a draft when the page is backgrounded/hidden (does NOT block bfcache)
  useEffect(() => {
    if (!isDirty) return;

    const save = () => onSaveDraftRef.current?.();
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        save();
      }
    };

    // pagehide fires reliably when navigating away or closing
    // visibilitychange fires when switching tabs
    // Neither blocks bfcache
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDirty]);

  // NO beforeunload - this is intentional to preserve bfcache
  // Data is saved via pagehide/visibilitychange and restored on return

  return {
    isDirty: shouldBlockRef.current,
  };
}
