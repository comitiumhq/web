import type { City } from '@comitium/schemas/cities';
import { useQuery } from '@tanstack/react-query';
import type { ChangeEvent, ComponentProps, FocusEventHandler, Ref } from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { SEARCH_DEBOUNCE_DELAY } from '../lib/config';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverAnchor, PopoverContent } from './popover';

type CitySearchInputSize = NonNullable<ComponentProps<typeof Input>['size']>;

export interface CitySearchInputProps {
  value: string;
  onCitySelect: (city: City, label: string) => void;
  onTextChange?: (value: string) => void;
  placeholder?: string;
  size?: CitySearchInputSize;
  disabled?: boolean;
  name?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  inputRef?: Ref<HTMLInputElement>;
  isFormFocusTarget?: boolean;
  searchCities: (query: string) => Promise<{ data: City[] }>;
}

interface CityOptionRowProps {
  city: City;
  onSelect: (city: City) => void;
}

function formatCityLabel(city: City): string {
  return [city.name, city.admin1, city.countryCode].filter(Boolean).join(', ');
}

const CityOptionRow = memo(function CityOptionRow({ city, onSelect }: CityOptionRowProps) {
  const handleClick = useCallback(() => onSelect(city), [city, onSelect]);

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-10 w-full justify-start rounded-xl px-3 text-label-14 font-normal"
      onClick={handleClick}
    >
      <span className="truncate">{formatCityLabel(city)}</span>
    </Button>
  );
});

export function CitySearchInput({
  value,
  onCitySelect,
  onTextChange,
  placeholder = 'Search city...',
  size = 'default',
  disabled,
  name,
  onBlur,
  inputRef,
  isFormFocusTarget,
  searchCities,
}: CitySearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { data: cities } = useQuery({
    queryKey: ['cities', 'search', searchQuery],
    queryFn: () => searchCities(searchQuery),
    enabled: searchQuery.length >= 2,
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000,
  });
  const hasSuggestions = !!cities && cities.length > 0 && searchQuery.length >= 2;

  useEffect(() => {
    if (!open) {
      setInputValue(value);
    }
  }, [open, value]);

  useEffect(() => {
    if (hasSuggestions) {
      setOpen(true);
    }
  }, [hasSuggestions]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setInputValue(nextValue);
      onTextChange?.(nextValue);
      setOpen(true);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        setSearchQuery(nextValue.trim());
      }, SEARCH_DEBOUNCE_DELAY);
    },
    [onTextChange],
  );

  const handleSelect = useCallback(
    (city: City) => {
      const label = formatCityLabel(city);
      setInputValue(label);
      setOpen(false);
      setSearchQuery('');
      onCitySelect(city, label);
    },
    [onCitySelect],
  );

  const handleFocus = useCallback(() => {
    if (hasSuggestions) {
      setOpen(true);
    }
  }, [hasSuggestions]);

  const preventPopoverAutoFocus = useCallback((event: Event) => {
    event.preventDefault();
  }, []);

  return (
    <Popover open={open && hasSuggestions} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          ref={inputRef}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={onBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          size={size}
          disabled={disabled}
          data-form-focus-target={isFormFocusTarget ? '' : undefined}
        />
      </PopoverAnchor>
      <PopoverContent
        className="max-h-60 w-(--radix-popover-trigger-width) gap-0 overflow-auto p-1"
        align="start"
        onOpenAutoFocus={preventPopoverAutoFocus}
      >
        {cities?.map((city) => (
          <CityOptionRow key={city.id} city={city} onSelect={handleSelect} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
