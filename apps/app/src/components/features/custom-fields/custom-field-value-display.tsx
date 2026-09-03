import type { FieldTypeId } from '@comitium/schemas/forms/field-types/types';
import { isNonEmptyString, isRecord } from '@comitium/schemas/guards';
import { Badge } from '@comitium/ui/badge';
import { formatDate } from '@comitium/ui/date';
import { getMemberDisplayName } from '@comitium/ui/display-name';
import { useCallback } from 'react';
import type { SelectableValue } from '@/lib/schemas/custom-fields';
import type { OrgTeamMember } from '@/lib/schemas/org';

interface CustomFieldValueDisplayProps {
  fieldType: FieldTypeId;
  value: unknown;
  selectableValues: SelectableValue[] | null;
  teamMap: Map<string, OrgTeamMember>;
}

export function CustomFieldValueDisplay({ fieldType, value, selectableValues, teamMap }: CustomFieldValueDisplayProps) {
  switch (fieldType) {
    case 'short_answer':
    case 'long_unformatted':
    case 'phone':
      return <TextValue value={value} />;
    case 'url':
      return <UrlValue value={value} />;
    case 'email':
      return <EmailValue value={value} />;
    case 'multiple_choice':
      return <MultipleChoiceValue value={value} selectableValues={selectableValues} />;
    case 'checkboxes':
      return <CheckboxesValue value={value} selectableValues={selectableValues} />;
    case 'yes_no':
      return <YesNoValue value={value} />;
    case 'date':
      return <DateValue value={value} />;
    case 'number':
      return <NumberValue value={value} />;
    case 'location':
      return <LocationValue value={value} />;
    case 'employee':
      return <EmployeeValue value={value} teamMap={teamMap} />;
    default:
      return <EmptyValue />;
  }
}

function EmptyValue() {
  return <span className="text-sm text-muted-foreground">—</span>;
}

function TextValue({ value }: { value: unknown }) {
  if (!isNonEmptyString(value)) {
    return <EmptyValue />;
  }

  return <p className="text-sm whitespace-pre-wrap break-words">{value}</p>;
}

function UrlValue({ value }: { value: unknown }) {
  const handleClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  if (!isNonEmptyString(value)) {
    return <EmptyValue />;
  }

  return (
    <a
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="text-sm text-primary underline break-all"
    >
      {value}
    </a>
  );
}

function EmailValue({ value }: { value: unknown }) {
  const handleClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  if (!isNonEmptyString(value)) {
    return <EmptyValue />;
  }

  return (
    <a href={`mailto:${value}`} onClick={handleClick} className="text-sm text-primary underline break-all">
      {value}
    </a>
  );
}

function MultipleChoiceValue({
  value,
  selectableValues,
}: {
  value: unknown;
  selectableValues: SelectableValue[] | null;
}) {
  if (!isNonEmptyString(value)) {
    return <EmptyValue />;
  }

  const label = selectableValues?.find((opt) => opt.value === value)?.label ?? value;

  return <span className="text-sm">{label}</span>;
}

function CheckboxesValue({ value, selectableValues }: { value: unknown; selectableValues: SelectableValue[] | null }) {
  if (!Array.isArray(value) || value.length === 0) {
    return <EmptyValue />;
  }

  const labels = value.map((v) => selectableValues?.find((opt) => opt.value === v)?.label ?? String(v));

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label, idx) => (
        <Badge key={`${label}-${idx}`} variant="secondary">
          {label}
        </Badge>
      ))}
    </div>
  );
}

function YesNoValue({ value }: { value: unknown }) {
  if (typeof value !== 'boolean') {
    return <EmptyValue />;
  }

  return <Badge variant="secondary">{value ? 'Yes' : 'No'}</Badge>;
}

function DateValue({ value }: { value: unknown }) {
  if (!isNonEmptyString(value)) {
    return <EmptyValue />;
  }

  const formatted = formatDate(value);

  if (!formatted) {
    return <EmptyValue />;
  }

  return <span className="text-sm">{formatted}</span>;
}

function NumberValue({ value }: { value: unknown }) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return <EmptyValue />;
  }

  return <span className="text-sm">{value}</span>;
}

function LocationValue({ value }: { value: unknown }) {
  if (!isRecord(value)) {
    return <EmptyValue />;
  }

  const loc = value as { city?: unknown; region?: unknown; country?: unknown };

  if (typeof loc.city !== 'string' || typeof loc.country !== 'string') {
    return <EmptyValue />;
  }

  const region = isNonEmptyString(loc.region) ? loc.region : null;
  const parts = [loc.city, region].filter(Boolean).join(', ');

  return (
    <span className="text-sm">
      {parts} <span className="text-muted-foreground">({loc.country})</span>
    </span>
  );
}

function EmployeeValue({ value, teamMap }: { value: unknown; teamMap: Map<string, OrgTeamMember> }) {
  if (!isNonEmptyString(value)) {
    return <EmptyValue />;
  }

  const member = teamMap.get(value);

  if (member) {
    return <span className="text-sm">{getMemberDisplayName(member)}</span>;
  }

  return <span className="text-sm text-muted-foreground">Former member</span>;
}
