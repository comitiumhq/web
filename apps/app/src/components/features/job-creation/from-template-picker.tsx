import { Combobox } from '@comitium/ui/combobox';
import { memo, useCallback } from 'react';
import { useQueryJobTemplates } from '@/hooks/queries/use-query-job-templates';
import type { JobTemplateListItem } from '@/lib/schemas/job-templates';

interface FromTemplatePickerProps {
  orgId: string;
  value: string | null;
  onChange: (templateId: string | null, template: JobTemplateListItem | null) => void;
  disabled?: boolean;
}

export const FromTemplatePicker = memo(function FromTemplatePicker({
  orgId,
  value,
  onChange,
  disabled,
}: FromTemplatePickerProps) {
  const { data, isLoading } = useQueryJobTemplates(orgId, { status: 'active', limit: 100 });

  const handleValueChange = useCallback(
    (next: string | null) => {
      const selectedTemplate = data?.data.find((template) => template.id === next) ?? null;

      onChange(selectedTemplate?.id ?? null, selectedTemplate);
    },
    [data, onChange],
  );

  const templates = data?.data ?? [];

  if (!isLoading && templates.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-label-13 text-muted-foreground">From template (optional)</div>
      <Combobox
        ariaLabel="Job template"
        options={templates.map((template) => ({ value: template.id, label: template.title }))}
        value={value}
        onValueChange={handleValueChange}
        placeholder="Choose a template…"
        searchPlaceholder="Search templates…"
        emptyMessage="No templates found."
        clearLabel="Clear template selection"
        disabled={disabled || isLoading}
      />
    </div>
  );
});
