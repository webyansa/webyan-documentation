import { useEffect, useCallback, useRef } from 'react';
import { useBeforeUnload } from 'react-router-dom';

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

  // Block browser close/refresh using React Router's useBeforeUnload
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (shouldBlockRef.current) {
          // Save draft before unload
          onSaveDraftRef.current?.();
          event.preventDefault();
          event.returnValue = message;
          return message;
        }
      },
      [message]
    )
  );

  // Also handle regular beforeunload for non-React Router navigation
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (shouldBlockRef.current) {
        onSaveDraftRef.current?.();
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [message]);

  return {
    isDirty: shouldBlockRef.current,
  };
}
