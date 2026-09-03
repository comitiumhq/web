import { Button } from '@comitium/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { XIcon } from '@phosphor-icons/react';
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
    (next: string) => {
      const selectedTemplate = data?.data.find((template) => template.id === next) ?? null;

      onChange(selectedTemplate?.id ?? null, selectedTemplate);
    },
    [data, onChange],
  );

  const handleClear = useCallback(() => {
    onChange(null, null);
  }, [onChange]);

  const templates = data?.data ?? [];

  if (!isLoading && templates.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-label-13 text-muted-foreground">From template (optional)</div>
      <div className="flex items-center gap-2">
        <Select value={value ?? ''} onValueChange={handleValueChange} disabled={disabled || isLoading}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a template…" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value !== null && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear template selection"
            className="shrink-0"
          >
            <XIcon />
          </Button>
        )}
      </div>
    </div>
  );
});
