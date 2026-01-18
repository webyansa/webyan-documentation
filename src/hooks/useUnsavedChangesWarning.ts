import { useEffect, useRef } from 'react';

interface UseUnsavedChangesWarningOptions {
  isDirty: boolean;
  message?: string;
  onSaveDraft?: () => void;
}

export function useUnsavedChangesWarning({
  isDirty,
  message = 'لديك تغييرات غير محفوظة. هل تريد المغادرة؟',
  onSaveDraft,
}: UseUnsavedChangesWarningOptions) {
  const shouldBlockRef = useRef(isDirty);
  shouldBlockRef.current = isDirty;

  const onSaveDraftRef = useRef(onSaveDraft);
  onSaveDraftRef.current = onSaveDraft;

  const messageRef = useRef(message);
  messageRef.current = message;

  // Save a draft when the page is backgrounded/hidden (does NOT block bfcache)
  useEffect(() => {
    if (!isDirty) return;

    const save = () => onSaveDraftRef.current?.();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        save();
      }
    };

    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDirty]);

  // IMPORTANT: we only attach beforeunload when dirty.
  // Attaching it permanently can disable the browser back/forward cache and make pages feel like they "refresh".
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      onSaveDraftRef.current?.();
      event.preventDefault();
      event.returnValue = messageRef.current;
      return messageRef.current;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return {
    isDirty: shouldBlockRef.current,
  };
}

