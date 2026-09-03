import type { City } from '@comitium/schemas/cities';
import { type ComponentType, type FocusEventHandler, type Ref, useCallback } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';

export type LocationOption = City;

export interface LocationInputProps {
  value: string;
  onCitySelect: (city: LocationOption, label: string) => void;
  onTextChange?: (value: string) => void;
  placeholder?: string;
  size?: 'default' | 'lg';
  disabled?: boolean;
  name?: string;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  inputRef?: Ref<HTMLInputElement>;
  isFormFocusTarget?: boolean;
}

export interface LocationValue {
  cityId: number;
  city: string;
  region?: string;
  country: string;
}

interface LocationWidgetProps {
  field: ControllerRenderProps;
  input: ComponentType<LocationInputProps>;
}

function valueToLabel(value: LocationValue | null): string {
  if (!value) {
    return '';
  }

  return [value.city, value.region, value.country].filter(Boolean).join(', ');
}

export function LocationWidget({ field, input: LocationInput }: LocationWidgetProps) {
  const { name, onBlur, onChange, ref, value } = field;
  const stored = (value ?? null) as LocationValue | null;
  const handleTextChange = useCallback(() => onChange(undefined), [onChange]);
  const handleCitySelect = useCallback(
    (city: City) => {
      const next: LocationValue = {
        cityId: city.id,
        city: city.name,
        country: city.countryCode,
        ...(city.admin1 ? { region: city.admin1 } : {}),
      };

      onChange(next);
    },
    [onChange],
  );

  return (
    <LocationInput
      value={valueToLabel(stored)}
      onCitySelect={handleCitySelect}
      onTextChange={handleTextChange}
      onBlur={onBlur}
      name={name}
      inputRef={ref}
      isFormFocusTarget
      size="lg"
      placeholder="Start typing a city..."
    />
  );
}
