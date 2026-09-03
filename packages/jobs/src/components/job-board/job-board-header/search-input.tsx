import { SEARCH_DEBOUNCE_DELAY } from '@comitium/ui/config';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@comitium/ui/input-group';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import { useCallback } from 'react';
import { useDebouncedInput } from '../../../hooks/use-debounced-input';

interface SearchInputProps {
  value?: string;
  onChange: (value: string | null) => void;
  skipRef?: React.RefObject<boolean>;
}

export function SearchInput({ value = '', onChange, skipRef }: SearchInputProps) {
  const { value: inputValue, setValue: setInputValue } = useDebouncedInput({
    externalValue: value,
    delay: SEARCH_DEBOUNCE_DELAY,
    onChange,
    skipRef,
  });

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange(null);
  }, [onChange, setInputValue]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [setInputValue],
  );

  return (
    <InputGroup className="h-11 flex-1">
      <InputGroupAddon>
        <MagnifyingGlassIcon />
      </InputGroupAddon>
      <InputGroupInput className="text-copy-16" placeholder="Search" value={inputValue} onChange={handleInputChange} />

      {inputValue && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="button" size="icon-sm" onClick={handleClear} aria-label="Clear search">
            <XIcon />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
