import { CitySearchInput } from '@comitium/ui/city-search-input';
import {
  buildDefaultValues,
  buildFormSchema,
  type FormRendererProps,
  type LocationInputProps,
  FormRenderer as SharedFormRenderer,
} from '@comitium/ui/forms';
import { createElement } from 'react';
import { searchCities as searchPublicCities } from '@/lib/api/cities';

export { buildDefaultValues, buildFormSchema };

export function FormRenderer(props: Omit<FormRendererProps, 'locationInput'>) {
  return createElement(SharedFormRenderer, { ...props, locationInput: PublicCitySearchInput });
}

function PublicCitySearchInput(props: LocationInputProps) {
  return createElement(CitySearchInput, { ...props, searchCities: searchPublicCities });
}
