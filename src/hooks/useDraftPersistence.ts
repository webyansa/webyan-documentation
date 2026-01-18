import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface DraftOptions {
  key: string; // Unique key for this draft (e.g., 'article', 'ticket')
  entityId?: string | null; // Entity ID for editing (null for new)
  debounceMs?: number; // Debounce delay in ms
  onRestore?: (data: any) => void; // Callback when draft is restored
  autoRestore?: boolean; // Restore automatically when a draft exists (default: true)
}

interface DraftMeta {
  timestamp: number;
  userId: string;
  entityId?: string | null;
}

interface StoredDraft<T> {
  data: T;
  meta: DraftMeta;
}

const DRAFT_PREFIX = 'draft:';

export function useDraftPersistence<T extends Record<string, any>>(
  initialData: T,
  options: DraftOptions
) {
  const { user } = useAuth();
  const { key, entityId, debounceMs = 500, onRestore, autoRestore = true } = options;

  const [data, setData] = useState<T>(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<Date | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const initialDataRef = useRef(initialData);
  const isRestoringRef = useRef(false);

  const dataRef = useRef(data);
  dataRef.current = data;
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  // Generate storage key based on type, entity, and user
  const getStorageKey = useCallback(() => {
    const userId = user?.id || 'anonymous';
    const entityPart = entityId ? `edit:${entityId}` : 'new';
    return `${DRAFT_PREFIX}${key}:${entityPart}:${userId}`;
  }, [key, entityId, user?.id]);

  // Load draft from localStorage
  const loadDraft = useCallback((): StoredDraft<T> | null => {
    try {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as StoredDraft<T>;

      // Validate draft belongs to current user
      if (user?.id && parsed.meta.userId !== user.id) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  }, [getStorageKey, user?.id]);

  // Save draft to localStorage
  const saveDraft = useCallback(
    (draftData: T) => {
      try {
        const storageKey = getStorageKey();
        const draft: StoredDraft<T> = {
          data: draftData,
          meta: {
            timestamp: Date.now(),
            userId: user?.id || 'anonymous',
            entityId,
          },
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setDraftTimestamp(new Date(draft.meta.timestamp));
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    },
    [getStorageKey, user?.id, entityId]
  );

  // Flush draft save immediately (useful on tab switch / pagehide)
  const flushDraftNow = useCallback(() => {
    if (isRestoringRef.current) return;
    if (!isDirtyRef.current) return;

    saveDraft(dataRef.current);
    setHasDraft(true);
  }, [saveDraft]);

  // Persist draft when the tab/app is backgrounded (keeps bfcache working)
  useEffect(() => {
    const handlePageHide = () => flushDraftNow();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushDraftNow();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushDraftNow]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftTimestamp(null);
      setIsDirty(false);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [getStorageKey]);

  // Update data with debounced draft save
  const updateData = useCallback(
    (updates: Partial<T> | ((prev: T) => T)) => {
      setData(prev => {
        const newData = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };

        // Check if data has changed from initial
        const hasChanges =
          JSON.stringify(newData) !== JSON.stringify(initialDataRef.current);
        setIsDirty(hasChanges);

        // Debounce draft save
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        if (hasChanges && !isRestoringRef.current) {
          debounceRef.current = setTimeout(() => {
            saveDraft(newData);
            setHasDraft(true);
          }, debounceMs);
        }

        return newData;
      });
    },
    [debounceMs, saveDraft]
  );

  // Restore draft data
  const restoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      isRestoringRef.current = true;
      setData(draft.data);
      setIsDirty(true);
      setShowRestorePrompt(false);
      onRestore?.(draft.data);

      // Reset flag after a tick
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 100);
    }
  }, [loadDraft, onRestore]);

  // Discard draft
  const discardDraft = useCallback(() => {
    clearDraft();
    setData(initialDataRef.current);
    setShowRestorePrompt(false);
    setIsDirty(false);
  }, [clearDraft]);

  // Reset to new initial data (e.g., when loading from server)
  const resetWithData = useCallback(
    (newData: T, clearExistingDraft = false) => {
      initialDataRef.current = newData;
      setData(newData);
      setIsDirty(false);
      setShowRestorePrompt(false);

      if (clearExistingDraft) {
        clearDraft();
      }
    },
    [clearDraft]
  );

  // Check for existing draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setHasDraft(true);
      setDraftTimestamp(new Date(draft.meta.timestamp));

      // Only restore/prompt if there's meaningful data
      const hasContent = Object.values(draft.data).some(value => {
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined;
      });

      if (hasContent) {
        if (autoRestore) {
          restoreDraft();
        } else {
          setShowRestorePrompt(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDraft, autoRestore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    data,
    setData: updateData,
    isDirty,
    hasDraft,
    draftTimestamp,
    showRestorePrompt,
    restoreDraft,
    discardDraft,
    clearDraft,
    saveDraftNow: () => saveDraft(dataRef.current),
    resetWithData,
  };
}

// Utility to clear all drafts for a user
export function clearAllUserDrafts(userId?: string) {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(DRAFT_PREFIX)) {
      if (!userId) {
        keysToRemove.push(key);
      } else {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.meta?.userId === userId) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  return keysToRemove.length;
}

// Get all drafts info for a user
export function getUserDrafts(userId: string) {
  const drafts: Array<{ key: string; timestamp: Date; type: string; entityId?: string }> = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(DRAFT_PREFIX)) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.meta?.userId === userId) {
            const parts = key.replace(DRAFT_PREFIX, '').split(':');
            drafts.push({
              key,
              timestamp: new Date(parsed.meta.timestamp),
              type: parts[0],
              entityId: parts[1] !== 'new' ? parts[1]?.replace('edit:', '') : undefined,
            });
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }
  }
  
  return drafts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
