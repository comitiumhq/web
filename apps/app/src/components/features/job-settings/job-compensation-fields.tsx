import { COMPENSATION_CURRENCIES, CURRENCIES, SALARY_PERIODS } from '@comitium/schemas/job-enums';
import { Combobox } from '@comitium/ui/combobox';
import { FormControl, FormField, FormItem, FormMessage } from '@comitium/ui/form';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@comitium/ui/input-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { type UseFormReturn, useWatch } from 'react-hook-form';
import { formatCompensationAmountInput, parseCompensationAmountInput } from '@/lib/jobs/compensation';
import type { JobSettingsFormData } from '@/lib/schemas/job-settings-form';
import { RequiredMarker } from './required-marker';

interface JobCompensationFieldsProps {
  form: UseFormReturn<JobSettingsFormData>;
  showPublishRequiredMarker?: boolean;
  readOnly?: boolean;
}

export function JobCompensationFields({
  form,
  showPublishRequiredMarker = true,
  readOnly = false,
}: JobCompensationFieldsProps) {
  const { control } = form;
  const currency = useWatch({ control, name: 'compensationCurrency' });
  const currencySymbol = CURRENCIES.find((item) => item.value === currency)?.symbol ?? '$';

  return (
    <fieldset disabled={readOnly}>
      <legend className="flex items-center gap-1 text-sm leading-none font-medium">
        Compensation <RequiredMarker show={showPublishRequiredMarker} />
      </legend>

      <div className="mt-2 flex flex-wrap items-start gap-3">
        <div className="grid min-w-0 flex-1 basis-72 grid-cols-[minmax(7rem,1fr)_auto_minmax(7rem,1fr)] items-start gap-2">
          <AmountField
            control={control}
            name="compensationMin"
            ariaLabel="Minimum compensation"
            placeholder="50,000"
            currencySymbol={currencySymbol}
          />
          <RangeConnector>to</RangeConnector>
          <AmountField
            control={control}
            name="compensationMax"
            ariaLabel="Maximum compensation"
            placeholder="80,000"
            currencySymbol={currencySymbol}
          />
        </div>
        <div className="grid min-w-0 flex-1 basis-64 grid-cols-[minmax(8rem,1fr)_auto_minmax(7rem,0.8fr)] items-start gap-2">
          <CompactSelectField
            control={control}
            name="compensationCurrency"
            ariaLabel="Currency"
            placeholder="USD ($)"
            options={COMPENSATION_CURRENCIES}
            displayOptions={CURRENCIES}
            searchable
          />
          <RangeConnector>per</RangeConnector>
          <CompactSelectField
            control={control}
            name="compensationPeriod"
            ariaLabel="Period"
            placeholder="Year"
            options={SALARY_PERIODS}
          />
        </div>
      </div>
    </fieldset>
  );
}

function RangeConnector({ children }: { children: string }) {
  return <span className="flex h-9 items-center text-sm text-muted-foreground">{children}</span>;
}

interface AmountFieldProps {
  control: UseFormReturn<JobSettingsFormData>['control'];
  name: 'compensationMin' | 'compensationMax';
  ariaLabel: string;
  placeholder: string;
  currencySymbol: string;
}

function AmountField({ control, name, ariaLabel, placeholder, currencySymbol }: AmountFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: { value, onChange, ref } }) => {
        const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          onChange(parseCompensationAmountInput(event.target.value));
        };

        return (
          <FormItem className="min-w-0">
            <FormControl>
              <InputGroup>
                <InputGroupAddon align="inline-start">{currencySymbol}</InputGroupAddon>
                <InputGroupInput
                  ref={ref}
                  type="text"
                  inputMode="numeric"
                  aria-label={ariaLabel}
                  placeholder={placeholder}
                  value={formatCompensationAmountInput(value)}
                  onChange={handleInputChange}
                />
              </InputGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

interface CompactSelectFieldProps {
  control: UseFormReturn<JobSettingsFormData>['control'];
  name: 'compensationCurrency' | 'compensationPeriod';
  ariaLabel: string;
  placeholder: string;
  options: readonly { value: string; label: string }[];
  displayOptions?: readonly { value: string; label: string }[];
  searchable?: boolean;
}

function CompactSelectField({
  control,
  name,
  ariaLabel,
  placeholder,
  options,
  displayOptions = options,
  searchable = false,
}: CompactSelectFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedLabel = displayOptions.find((option) => option.value === field.value)?.label;

        if (searchable) {
          const searchableOptions = options.map((option) => ({
            value: option.value,
            label: displayOptions.find((displayOption) => displayOption.value === option.value)?.label ?? option.label,
          }));

          return (
            <FormItem>
              <FormControl>
                <Combobox
                  ariaLabel={ariaLabel}
                  options={searchableOptions}
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  placeholder={placeholder}
                  searchPlaceholder={`Search ${ariaLabel.toLowerCase()}…`}
                  emptyMessage={`No ${ariaLabel.toLowerCase()} options found.`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }

        return (
          <FormItem>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger className="w-full" aria-label={ariaLabel}>
                  <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
