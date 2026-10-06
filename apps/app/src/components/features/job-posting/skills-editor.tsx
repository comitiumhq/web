import { MAX_POSTING_SKILLS, type SkillRequirement } from '@comitium/schemas/skills';
import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { SkillSearchInput } from '@comitium/ui/skill-search-input';
import { ToggleGroup, ToggleGroupItem } from '@comitium/ui/toggle-group';
import { type DragDropEventHandlers, DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { DotsSixVerticalIcon, XIcon } from '@phosphor-icons/react';
import { searchSkills } from '@/lib/api/skills';
import { cn } from '@/lib/utils';
import { applyDndReorder } from '@/lib/utils/dnd';

interface SkillsEditorProps {
  value: SkillRequirement[];
  onChange: (skills: SkillRequirement[]) => void;
  disabled?: boolean;
}

export function SkillsEditor({ value, onChange, disabled = false }: SkillsEditorProps) {
  const selectedIds = value.map((skill) => skill.skillId);
  const atLimit = value.length >= MAX_POSTING_SKILLS;
  const excessSkillCount = value.length - MAX_POSTING_SKILLS;

  function addSkill(skill: { id: string; label: string }) {
    if (atLimit) {
      return;
    }

    onChange([...value, { skillId: skill.id, label: skill.label, required: true, status: 'active' }]);
  }

  function setRequired(skillId: string, required: boolean) {
    onChange(value.map((skill) => (skill.skillId === skillId ? { ...skill, required } : skill)));
  }

  function removeSkill(skillId: string) {
    onChange(value.filter((skill) => skill.skillId !== skillId));
  }

  const handleDragEnd: DragDropEventHandlers['onDragEnd'] = (event) => {
    if (disabled || event.canceled) {
      return;
    }

    const { source, target } = event.operation;
    const reordered = applyDndReorder(value, (skill) => skill.skillId, source, target);

    if (reordered) {
      onChange(reordered);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-3">
        <p className="text-copy-13 text-muted-foreground">
          Up to {MAX_POSTING_SKILLS} skills, shown to candidates in this order.
        </p>

        {!disabled && (
          <div className="w-full max-w-md">
            <SkillSearchInput
              searchSkills={searchSkills}
              onSelect={addSkill}
              excludeIds={selectedIds}
              placeholder="Search and add skills"
              disabled={atLimit}
            />
          </div>
        )}

        {!disabled && excessSkillCount > 0 && (
          <p className="text-copy-12 text-destructive" role="alert">
            Remove {excessSkillCount} skills before saving.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-label-14 font-medium">
          Selected skills ({value.length}/{MAX_POSTING_SKILLS})
        </h3>

        {value.length === 0 ? (
          <div className="rounded-xl border border-dashed border-separator px-4 py-5 text-copy-13 text-muted-foreground">
            No skills selected yet.
          </div>
        ) : (
          <DragDropProvider onDragEnd={handleDragEnd}>
            <ul className="divide-y divide-separator rounded-xl border border-separator bg-card">
              {value.map((skill, index) => (
                <SkillRow
                  key={skill.skillId}
                  skill={skill}
                  index={index}
                  count={value.length}
                  disabled={disabled}
                  onRequiredChange={setRequired}
                  onRemove={removeSkill}
                />
              ))}
            </ul>
          </DragDropProvider>
        )}
      </div>
    </div>
  );
}

interface SkillRowProps {
  skill: SkillRequirement;
  index: number;
  count: number;
  disabled: boolean;
  onRequiredChange: (skillId: string, required: boolean) => void;
  onRemove: (skillId: string) => void;
}

function SkillRow({ skill, index, count, disabled, onRequiredChange, onRemove }: SkillRowProps) {
  const canReorder = !disabled && count > 1;
  const { ref, handleRef, isDragging } = useSortable({ id: skill.skillId, index, disabled: !canReorder });

  return (
    <li
      ref={ref}
      className={cn(
        'flex min-h-14 flex-wrap items-center gap-x-2 gap-y-2 px-2 py-2 sm:gap-x-3 sm:px-3',
        isDragging && 'relative z-50 bg-popover shadow-lg ring-1 ring-primary/30',
      )}
    >
      <Button
        ref={handleRef}
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn(
          'shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing',
          !canReorder && 'invisible',
        )}
        aria-label={`Reorder ${skill.label}`}
        inert={!canReorder}
      >
        <DotsSixVerticalIcon />
      </Button>

      <div className="flex min-w-40 flex-1 flex-wrap items-center gap-2">
        <span className="text-label-14">{skill.label}</span>
        {skill.status === 'retired' && <Badge variant="secondary">Retired · remove or replace</Badge>}
      </div>

      {disabled ? (
        <Badge variant="secondary">{skill.required ? 'Required' : 'Preferred'}</Badge>
      ) : (
        <div className="flex items-center gap-1">
          <ToggleGroup
            type="single"
            value={skill.required ? 'required' : 'preferred'}
            onValueChange={(next) => {
              if (next) {
                onRequiredChange(skill.skillId, next === 'required');
              }
            }}
            aria-label={`Importance for ${skill.label}`}
            variant="outline"
            size="sm"
            spacing={0}
          >
            <ToggleGroupItem value="required">Required</ToggleGroupItem>
            <ToggleGroupItem value="preferred">Preferred</ToggleGroupItem>
          </ToggleGroup>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={`Remove ${skill.label}`}
            onClick={() => onRemove(skill.skillId)}
          >
            <XIcon />
          </Button>
        </div>
      )}
    </li>
  );
}
