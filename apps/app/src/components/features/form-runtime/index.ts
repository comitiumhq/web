import { CitySearchInput } from '@comitium/ui/city-search-input';
import {
  buildDefaultValues,
  buildFormSchema,
  type FormDisplayProps,
  type FormRendererProps,
  type LocationInputProps,
  FormDisplay as SharedFormDisplay,
  FormRenderer as SharedFormRenderer,
} from '@comitium/ui/forms';
import { createElement } from 'react';
import { searchCities } from '@/lib/api/cities';
import { AppFormattableTextDisplay, AppFormattableTextInput } from './formattable-text';

export { buildDefaultValues, buildFormSchema };

export function FormDisplay(props: Omit<FormDisplayProps, 'formattableTextDisplay'>) {
  return createElement(SharedFormDisplay, {
    ...props,
    formattableTextDisplay: AppFormattableTextDisplay,
  });
}

export function FormRenderer(props: Omit<FormRendererProps, 'locationInput' | 'formattableTextInput'>) {
  return createElement(SharedFormRenderer, {
    ...props,
    locationInput: AppCitySearchInput,
    formattableTextInput: AppFormattableTextInput,
  });
}

function AppCitySearchInput(props: LocationInputProps) {
  return createElement(CitySearchInput, { ...props, searchCities });
}
