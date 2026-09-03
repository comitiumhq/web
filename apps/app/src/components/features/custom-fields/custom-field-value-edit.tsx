import type { City } from '@comitium/schemas/cities';
import type { FieldTypeId } from '@comitium/schemas/forms/field-types/types';
import { isNonEmptyString, isRecord } from '@comitium/schemas/guards';
import { Button } from '@comitium/ui/button';
import { Calendar } from '@comitium/ui/calendar';
import { Checkbox } from '@comitium/ui/checkbox';
import { CitySearchInput } from '@comitium/ui/city-search-input';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { SearchSelect, type SearchSelectOption } from '@comitium/ui/search-select';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Switch } from '@comitium/ui/switch';
import { Textarea } from '@comitium/ui/textarea';
import { CalendarIcon } from '@phosphor-icons/react';
import { format, parseISO } from 'date-fns';
import { useCallback, useId, useMemo, useState } from 'react';
import { searchCities } from '@/lib/api/cities';
import type { SelectableValue } from '@/lib/schemas/custom-fields';
import type { OrgTeamMember } from '@/lib/schemas/org';

interface CustomFieldValueEditProps {
  fieldType: FieldTypeId;
  value: unknown;
  selectableValues: SelectableValue[] | null;
  team: OrgTeamMember[];
  onChange: (value: unknown) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function CustomFieldValueEdit({
  fieldType,
  value,
  selectableValues,
  team,
  onChange,
  disabled,
  autoFocus,
}: CustomFieldValueEditProps) {
  switch (fieldType) {
    case 'short_answer':
      return <ShortTextEdit value={value} onChange={onChange} disabled={disabled} autoFocus={autoFocus} />;
    case 'long_unformatted':
      return <LongTextEdit value={value} onChange={onChange} disabled={disabled} autoFocus={autoFocus} />;
    case 'phone':
      return (
        <ShortTextEdit value={value} onChange={onChange} disabled={disabled} inputType="tel" autoFocus={autoFocus} />
      );
    case 'url':
      return (
        <ShortTextEdit value={value} onChange={onChange} disabled={disabled} inputType="url" autoFocus={autoFocus} />
      );
    case 'email':
      return (
        <ShortTextEdit value={value} onChange={onChange} disabled={disabled} inputType="email" autoFocus={autoFocus} />
      );
    case 'multiple_choice':
      return (
        <MultipleChoiceEdit value={value} selectableValues={selectableValues} onChange={onChange} disabled={disabled} />
      );
    case 'checkboxes':
      return (
        <CheckboxesEdit value={value} selectableValues={selectableValues} onChange={onChange} disabled={disabled} />
      );
    case 'yes_no':
      return <YesNoEdit value={value} onChange={onChange} disabled={disabled} />;
    case 'date':
      return <DateEdit value={value} onChange={onChange} disabled={disabled} />;
    case 'number':
      return <NumberEdit value={value} onChange={onChange} disabled={disabled} autoFocus={autoFocus} />;
    case 'location':
      return <LocationEdit value={value} onChange={onChange} disabled={disabled} />;
    case 'employee':
      return <EmployeeEdit value={value} team={team} onChange={onChange} disabled={disabled} />;
    default:
      return null;
  }
}

interface PrimitiveEditProps {
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

type SelectOption = {
  value: string;
  label: string;
};

const EMPTY_SELECT_VALUE = '__custom_field_empty__';

function ShortTextEdit({
  value,
  onChange,
  disabled,
  inputType = 'text',
  autoFocus,
}: PrimitiveEditProps & { inputType?: string }) {
  const display = isNonEmptyString(value) ? value : '';
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value), [onChange]);

  return <Input type={inputType} value={display} onChange={handleChange} disabled={disabled} autoFocus={autoFocus} />;
}

function LongTextEdit({ value, onChange, disabled, autoFocus }: PrimitiveEditProps) {
  const display = isNonEmptyString(value) ? value : '';
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value), [onChange]);

  return (
    <Textarea
      value={display}
      onChange={handleChange}
      disabled={disabled}
      rows={8}
      className="max-h-[65vh]"
      autoFocus={autoFocus}
    />
  );
}

function NumberEdit({ value, onChange, disabled, autoFocus }: PrimitiveEditProps) {
  const display = typeof value === 'number' && !Number.isNaN(value) ? String(value) : '';
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      if (raw === '') {
        onChange(null);

        return;
      }

      const parsed = Number(raw);

      if (!Number.isNaN(parsed)) {
        onChange(parsed);
      }
    },
    [onChange],
  );

  return <Input type="number" value={display} onChange={handleChange} disabled={disabled} autoFocus={autoFocus} />;
}

function YesNoEdit({ value, onChange, disabled }: PrimitiveEditProps) {
  const checked = value === true;
  const handleChange = useCallback((next: boolean) => onChange(next), [onChange]);

  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={handleChange} disabled={disabled} />
      <span className="text-sm text-muted-foreground">{checked ? 'Yes' : 'No'}</span>
    </div>
  );
}

function visibleOptions(
  options: SelectableValue[] | null,
  isCurrent: (sv: SelectableValue) => boolean,
): SelectableValue[] {
  return (options ?? []).filter((sv) => !sv.isArchived || isCurrent(sv));
}

function MultipleChoiceEdit({
  value,
  selectableValues,
  onChange,
  disabled,
}: PrimitiveEditProps & { selectableValues: SelectableValue[] | null }) {
  const current = isNonEmptyString(value) ? value : '';
  const options = useMemo<SelectOption[]>(
    () =>
      visibleOptions(selectableValues, (sv) => sv.value === current).map((sv) => ({
        value: sv.value,
        label: sv.isArchived ? `${sv.label} (archived)` : sv.label,
      })),
    [selectableValues, current],
  );
  const handleChange = useCallback(
    (next: string) => {
      onChange(next === EMPTY_SELECT_VALUE ? null : next);
    },
    [onChange],
  );

  return (
    <Select value={current} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select option..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>No value</SelectItem>
        {options.length > 0 && <SelectSeparator />}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CheckboxesEdit({
  value,
  selectableValues,
  onChange,
  disabled,
}: PrimitiveEditProps & { selectableValues: SelectableValue[] | null }) {
  const selected = useMemo(
    () => new Set(Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []),
    [value],
  );
  const options = useMemo(
    () => visibleOptions(selectableValues, (sv) => selected.has(sv.value)),
    [selectableValues, selected],
  );

  const handleToggle = useCallback(
    (optValue: string, isChecked: boolean) => {
      const next = new Set(selected);

      if (isChecked) {
        next.add(optValue);
      } else {
        next.delete(optValue);
      }

      onChange(Array.from(next));
    },
    [selected, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <CheckboxRow
          key={opt.value}
          option={opt}
          checked={selected.has(opt.value)}
          onToggle={handleToggle}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function CheckboxRow({
  option,
  checked,
  onToggle,
  disabled,
}: {
  option: SelectableValue;
  checked: boolean;
  onToggle: (value: string, isChecked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const handleChange = useCallback(
    (next: boolean | 'indeterminate') => onToggle(option.value, next === true),
    [onToggle, option.value],
  );

  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={handleChange} disabled={disabled} />
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
        {option.label}
        {option.isArchived && <span className="ml-1.5 text-muted-foreground">(archived)</span>}
      </Label>
    </div>
  );
}

function DateEdit({ value, onChange, disabled }: PrimitiveEditProps) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => {
    if (!isNonEmptyString(value)) {
      return null;
    }

    try {
      const d = parseISO(value);

      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }, [value]);

  const display = parsed ? format(parsed, 'MMM d, yyyy') : 'Pick a date';

  const handleSelect = useCallback(
    (next?: Date) => {
      if (!next) {
        onChange(null);
      } else {
        onChange(format(next, 'yyyy-MM-dd'));
      }

      setOpen(false);
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="justify-start font-normal" disabled={disabled}>
          <CalendarIcon data-icon="inline-start" />
          {display}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={parsed ?? undefined} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}

function EmployeeEdit({ value, team, onChange, disabled }: PrimitiveEditProps & { team: OrgTeamMember[] }) {
  const current = isNonEmptyString(value) ? value : '';
  const options = useMemo<SearchSelectOption[]>(
    () =>
      team
        .filter((member) => member.isActive || member.userId === current)
        .map((member) => ({
          value: member.userId,
          label: getMemberDisplayName(member),
          searchValue: [getMemberDisplayName(member), member.email].filter(Boolean).join(' '),
          description: member.email ?? undefined,
          trailing: member.isActive ? undefined : 'Inactive',
        })),
    [team, current],
  );
  const handleChange = useCallback((next: string | null) => onChange(next), [onChange]);

  return (
    <SearchSelect
      options={options}
      value={current || null}
      onValueChange={handleChange}
      disabled={disabled}
      placeholder="Select employee..."
      searchPlaceholder="Search employees..."
      emptyMessage="No employee found."
      clearLabel="No value"
      unknownValueLabel="Former member"
    />
  );
}

type LocationValue = { cityId: number; city: string; region?: string; country: string };

function LocationEdit({ value, onChange, disabled }: PrimitiveEditProps) {
  const current = isLocationValue(value) ? value : null;
  const handleTextChange = useCallback(() => onChange(null), [onChange]);
  const handleCitySelect = useCallback(
    (city: City) => {
      const next: LocationValue = {
        cityId: city.id,
        city: city.name,
        region: city.admin1 ?? undefined,
        country: city.countryCode,
      };

      onChange(next);
    },
    [onChange],
  );

  return (
    <CitySearchInput
      searchCities={searchCities}
      value={current ? formatLocation(current) : ''}
      onCitySelect={handleCitySelect}
      onTextChange={handleTextChange}
      placeholder="Search city..."
      disabled={disabled}
    />
  );
}

function isLocationValue(value: unknown): value is LocationValue {
  if (!isRecord(value)) {
    return false;
  }

  const loc = value as Record<string, unknown>;

  return typeof loc.city === 'string' && typeof loc.country === 'string';
}

function formatLocation(loc: LocationValue): string {
  return [loc.city, loc.region, loc.country].filter(Boolean).join(', ');
}
