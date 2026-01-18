import { useEffect, useCallback, useRef } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';

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

  // Block browser close/refresh
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (shouldBlockRef.current) {
          event.preventDefault();
          event.returnValue = message;
          return message;
        }
      },
      [message]
    )
  );

  // Block internal navigation using React Router's blocker
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        return (
          shouldBlockRef.current &&
          currentLocation.pathname !== nextLocation.pathname
        );
      },
      []
    )
  );

  // Handle navigation block
  useEffect(() => {
    if (blocker.state === 'blocked') {
      // Show native confirm dialog
      const confirmLeave = window.confirm(
        `${message}\n\nاضغط "موافق" للمغادرة أو "إلغاء" للبقاء.`
      );

      if (confirmLeave) {
        // Optionally save draft before leaving
        if (onSaveDraft) {
          onSaveDraft();
        }
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, message, onSaveDraft]);

  return {
    isBlocked: blocker.state === 'blocked',
    proceed: () => blocker.state === 'blocked' && blocker.proceed(),
    reset: () => blocker.state === 'blocked' && blocker.reset(),
  };
}
