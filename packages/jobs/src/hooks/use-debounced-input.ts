import { useEffect, useRef, useState } from 'react';

interface UseDebouncedInputOptions {
  externalValue: string;
  delay?: number;
  onChange: (value: string | null) => void;
  skipRef?: React.RefObject<boolean>;
}

export function useDebouncedInput({ externalValue, delay = 300, onChange, skipRef }: UseDebouncedInputOptions) {
  const [value, setValue] = useState(externalValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isInitialMount = useRef(true);

  // Sync external → local
  useEffect(() => {
    setValue(externalValue);
  }, [externalValue]);

  // Debounce local → external
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (skipRef?.current) {
        skipRef.current = false;
        return;
      }

      if (value !== externalValue) {
        onChange(value || null);
      }
    }, delay);

    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const clear = () => {
    clearTimeout(debounceRef.current);
    setValue('');
  };

  return { value, setValue, clear };
}
