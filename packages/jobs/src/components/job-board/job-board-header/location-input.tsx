import { Button } from '@comitium/ui/button';
import { FILTER_DEBOUNCE_DELAY, LOCATION_SUGGESTIONS_LIMIT } from '@comitium/ui/config';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@comitium/ui/input-group';
import { Popover, PopoverAnchor, PopoverContent } from '@comitium/ui/popover';
import { MapPinIcon, XIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import type { PublicJobsApi } from '../../../api';
import { useDebouncedInput } from '../../../hooks/use-debounced-input';
import { useQueryLocations } from '../../../queries/use-query-locations';

interface LocationInputProps {
  api: PublicJobsApi;
  value?: string;
  onChange: (value: string | null) => void;
  skipRef?: React.RefObject<boolean>;
}

interface LocationSuggestionButtonProps {
  name: string;
  count: number;
  onSelect: (location: string) => void;
}

function LocationSuggestionButton({ name, count, onSelect }: LocationSuggestionButtonProps) {
  const handleClick = useCallback(() => {
    onSelect(name);
  }, [name, onSelect]);

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-10 w-full justify-start rounded-xl px-3 text-label-14 font-normal"
      onClick={handleClick}
    >
      <span className="truncate">{name}</span>
      <span className="ml-auto shrink-0 text-label-12 text-muted-foreground">{count}</span>
    </Button>
  );
}

export function LocationInput({ api, value = '', onChange, skipRef }: LocationInputProps) {
  const { data: locationsData } = useQueryLocations(api);
  const { value: inputValue, setValue: setInputValue } = useDebouncedInput({
    externalValue: value,
    delay: FILTER_DEBOUNCE_DELAY,
    onChange,
    skipRef,
  });
  const [open, setOpen] = useState(false);

  const filteredLocations = useMemo(() => {
    return locationsData?.filter((l) => l.name?.toLowerCase().includes(inputValue.toLowerCase())) || [];
  }, [inputValue, locationsData]);
  const visibleLocations = useMemo(() => {
    return filteredLocations.slice(0, LOCATION_SUGGESTIONS_LIMIT);
  }, [filteredLocations]);

  const selectLocation = useCallback(
    (location: string) => {
      setInputValue(location);
      setOpen(false);
      onChange(location);
    },
    [onChange, setInputValue],
  );

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange(null);
    setOpen(false);
  }, [onChange, setInputValue]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setOpen(true);
    },
    [setInputValue],
  );

  const handleInputFocus = useCallback(() => {
    setOpen(true);
  }, []);

  const handleOpenAutoFocus = useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  return (
    <Popover open={open && filteredLocations.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <InputGroup className="h-11 w-full sm:w-80 sm:shrink-0">
          <InputGroupAddon>
            <MapPinIcon />
          </InputGroupAddon>
          <InputGroupInput
            className="text-copy-16"
            placeholder="Location"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
          />
          {inputValue && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="button" size="icon-sm" onClick={handleClear} aria-label="Clear location">
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </PopoverAnchor>
      <PopoverContent
        className="max-h-60 w-80 gap-0 overflow-auto p-1"
        align="start"
        onOpenAutoFocus={handleOpenAutoFocus}
      >
        {visibleLocations.map((loc) => (
          <LocationSuggestionButton key={loc.name} name={loc.name} count={loc.count} onSelect={selectLocation} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
