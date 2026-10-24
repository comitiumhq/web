import { useCallback, useEffect, useRef, useState } from 'react';
import { isDefined } from '@/lib/utils';

export interface AutosaveSnapshot<T extends object> {
  data: T;
  blockedKeys?: (keyof T)[];
  validationMessages?: Partial<Record<keyof T, string[]>>;
}

interface AutosaveOptions<T extends object> extends AutosaveSnapshot<T> {
  initialData: T | null;
  enabled?: boolean;
  onSave: (changes: Partial<T>) => Promise<unknown>;
}

function changedKeys<T extends object>(current: T, saved: T, unconfirmed: (keyof T)[] = []): (keyof T)[] {
  const keys = [...new Set([...(Object.keys(current) as (keyof T)[]), ...unconfirmed])];

  return keys.filter((key) => unconfirmed.includes(key) || JSON.stringify(current[key]) !== JSON.stringify(saved[key]));
}

/**
 * Coalesce JSON field updates into sequential requests without resetting local input.
 * Failed requests remain paused until an explicit retry; invalid fields stay local.
 */
export function useAutosave<T extends object>({
  data,
  blockedKeys = [],
  validationMessages: fieldMessages = {},
  initialData,
  enabled = true,
  onSave,
}: AutosaveOptions<T>) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const savedRef = useRef<T | null>(null);
  const currentRef = useRef({ data, blockedKeys, enabled, onSave });

  currentRef.current = { data, blockedKeys, enabled, onSave };

  const requestRef = useRef<Promise<boolean> | null>(null);
  const errorRef = useRef<unknown>(null);
  const unconfirmedKeysRef = useRef<(keyof T)[]>([]);
  const immediateRef = useRef(false);
  const [revision, setRevision] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (isDefined(initialData) && savedRef.current === null) {
      savedRef.current = initialData;
      setRevision((value) => value + 1);
    }
  }, [initialData]);

  const flush = useCallback((): Promise<boolean> => {
    if (requestRef.current) {
      return requestRef.current;
    }

    const persist = async () => {
      if (savedRef.current === null) {
        return true;
      }

      if (errorRef.current) {
        return false;
      }

      while (savedRef.current && mountedRef.current) {
        const current = currentRef.current;
        const keys = changedKeys(current.data, savedRef.current, unconfirmedKeysRef.current);
        const validKeys = keys.filter((key) => !current.blockedKeys.includes(key));

        if (validKeys.length === 0) {
          return keys.length === 0;
        }

        if (!current.enabled) {
          return false;
        }

        const changes: Partial<T> = {};

        for (const key of validKeys) {
          changes[key] = current.data[key];
        }

        setIsSaving(true);

        try {
          await current.onSave(changes);

          savedRef.current = { ...savedRef.current, ...changes };
          unconfirmedKeysRef.current = unconfirmedKeysRef.current.filter((key) => !validKeys.includes(key));
          setRevision((value) => value + 1);
        } catch (cause) {
          unconfirmedKeysRef.current = [...new Set([...unconfirmedKeysRef.current, ...validKeys])];
          errorRef.current = cause;
          setError(cause);

          return false;
        }
      }

      return true;
    };

    const request = persist().finally(() => {
      requestRef.current = null;
      setIsSaving(false);
    });

    requestRef.current = request;

    return request;
  }, []);

  const acceptSavedData = useCallback((next: T) => {
    savedRef.current = next;
    setRevision((value) => value + 1);
  }, []);

  const retry = useCallback(() => {
    errorRef.current = null;
    setError(null);

    return flush();
  }, [flush]);

  const saveImmediately = useCallback(() => {
    immediateRef.current = true;
    setRevision((value) => value + 1);
  }, []);

  const signature = JSON.stringify({ data, blockedKeys });

  useEffect(() => {
    if (!enabled || errorRef.current || savedRef.current === null) {
      return;
    }

    const delay = immediateRef.current ? 0 : 600;

    immediateRef.current = false;

    const timer = setTimeout(() => void flush(), delay);

    return () => clearTimeout(timer);
  }, [signature, enabled, flush, revision]);

  const keys = savedRef.current ? changedKeys(data, savedRef.current, unconfirmedKeysRef.current) : [];
  const isDirty = keys.length > 0;
  const invalidKeys = keys.filter((key) => blockedKeys.includes(key));
  const hasInvalidChanges = invalidKeys.length > 0;
  const validationMessages = [...new Set(invalidKeys.flatMap((key) => fieldMessages[key] ?? []))];

  return {
    isDirty,
    isSaving,
    hasInvalidChanges,
    validationMessages,
    error,
    flush,
    retry,
    saveImmediately,
    acceptSavedData,
  };
}

export type Autosave = Omit<ReturnType<typeof useAutosave>, 'acceptSavedData'>;
