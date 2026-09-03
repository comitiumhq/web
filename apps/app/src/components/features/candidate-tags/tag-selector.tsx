import { Button } from '@comitium/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@comitium/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@comitium/ui/popover';
import { PlusIcon } from '@phosphor-icons/react';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  useAssignTagToCandidate,
  useCreateCandidateTag,
  useUnassignTagFromCandidate,
} from '@/hooks/mutations/use-candidate-tag';
import { useQueryOrgVaultKey } from '@/hooks/queries/use-query-org-vault-key';
import { useQueryWrappedVaultKey } from '@/hooks/queries/use-query-wrapped-vault-key';
import { useCandidateTags } from '@/hooks/use-candidate-tags';
import { usePermissions } from '@/hooks/use-permissions';
import { type DecryptedCandidateTag, tagLabelFieldSchema } from '@/lib/schemas/candidate-tags';
import { Permission } from '@/lib/schemas/org';
import { isDefined } from '@/lib/utils';

import { TagChip } from './tag-chip';

interface TagSelectorProps {
  orgId: string;
  candidateId: string | null;
  tagIds: string[];
  canAssign: boolean;
  maxVisibleTags?: number;
}

export function TagSelector({
  orgId,
  candidateId,
  tagIds,
  canAssign,
  maxVisibleTags = Number.MAX_SAFE_INTEGER,
}: TagSelectorProps) {
  const { can } = usePermissions();
  const canManage = can(Permission.TAG_WRITE);

  const { tags, tagMap } = useCandidateTags(orgId);
  const { data: vaultKey } = useQueryOrgVaultKey(orgId);
  const { data: wrappedVaultKey } = useQueryWrappedVaultKey(orgId);

  const { mutateAsync: createTagAsync, isPending: isCreating } = useCreateCandidateTag();
  const { mutate: assign, mutateAsync: assignAsync, isPending: isAssigning } = useAssignTagToCandidate();
  const { mutate: unassign } = useUnassignTagFromCandidate();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const assignedTagIds = useMemo(() => new Set(tagIds), [tagIds]);
  const activeTags = useMemo(() => tags.filter((t) => !t.isArchived), [tags]);

  const availableTags = useMemo(
    () => activeTags.filter((t) => !assignedTagIds.has(t.id)),
    [activeTags, assignedTagIds],
  );

  const trimmedInput = inputValue.trim().toLowerCase();

  const labelValidation = useMemo(() => {
    if (!inputValue.trim()) {
      return null;
    }

    const parsed = tagLabelFieldSchema.safeParse(inputValue);

    return parsed.success ? null : parsed.error.issues[0].message;
  }, [inputValue]);

  const hasActiveMatch = useMemo(
    () => activeTags.some((t) => t.label.toLowerCase() === trimmedInput),
    [activeTags, trimmedInput],
  );

  const hasArchivedMatch = useMemo(
    () => !hasActiveMatch && tags.some((t) => t.isArchived && t.label.toLowerCase() === trimmedInput),
    [tags, trimmedInput, hasActiveMatch],
  );

  const assignedTags = useMemo(
    (): DecryptedCandidateTag[] =>
      tagIds.map((id) => tagMap.get(id)).filter((t): t is DecryptedCandidateTag => isDefined(t)),
    [tagIds, tagMap],
  );
  const visibleTags = useMemo(() => getVisibleTags(assignedTags, maxVisibleTags), [assignedTags, maxVisibleTags]);
  const hiddenTags = useMemo(() => getHiddenTags(assignedTags, maxVisibleTags), [assignedTags, maxVisibleTags]);

  const trimmedInputValue = inputValue.trim();
  const canCreateNewTag = canManage && !!trimmedInputValue && !hasActiveMatch && !hasArchivedMatch && !labelValidation;

  const closePopover = useCallback(() => {
    setOpen(false);
    setInputValue('');
  }, []);

  const handleAssign = useCallback(
    (tagId: string) => {
      if (!candidateId) {
        return;
      }

      assign({ candidateId, tagId, orgId }, { onSuccess: closePopover });
    },
    [assign, candidateId, orgId, closePopover],
  );

  const handleRemove = useCallback(
    (tagId: string) => {
      if (!candidateId) {
        return;
      }

      unassign({ candidateId, tagId, orgId });
    },
    [unassign, candidateId, orgId],
  );

  const handleCreateAndAssign = useCallback(async () => {
    if (!vaultKey?.vaultPublicKey || !wrappedVaultKey || !candidateId) {
      return;
    }

    const parsed = tagLabelFieldSchema.safeParse(inputValue);

    if (!parsed.success) {
      return;
    }

    const trimmed = parsed.data;

    try {
      const created = await createTagAsync({
        orgId,
        label: trimmed,
        vaultPublicKey: vaultKey.vaultPublicKey,
        vaultKeyVersion: vaultKey.keyVersion,
        wrappedVaultKey,
      });

      await assignAsync({ candidateId, tagId: created.data.id, orgId });
      closePopover();
    } catch {
      // Errors surfaced by mutation hooks via toast; keep popover open for retry.
    }
  }, [
    assignAsync,
    candidateId,
    createTagAsync,
    inputValue,
    orgId,
    vaultKey?.vaultPublicKey,
    wrappedVaultKey,
    closePopover,
  ]);

  if (!canAssign && assignedTags.length === 0) {
    return null;
  }

  const isCreatingOrAssigning = isCreating || isAssigning;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canAssign && candidateId && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 px-2 text-label-12">
              <PlusIcon data-icon="inline-start" />
              Add tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search or create..." value={inputValue} onValueChange={setInputValue} />
              <CommandList>
                <CommandEmpty>
                  <EmptyStateMessage
                    hasArchivedMatch={hasArchivedMatch}
                    labelValidation={labelValidation}
                    canCreateNewTag={canCreateNewTag}
                    trimmedInputValue={trimmedInputValue}
                    onCreate={handleCreateAndAssign}
                    disabled={isCreatingOrAssigning}
                  />
                </CommandEmpty>

                {availableTags.length > 0 && (
                  <CommandGroup heading="Existing tags">
                    {availableTags.map((tag) => (
                      <AvailableTagItem key={tag.id} tag={tag} onSelect={handleAssign} />
                    ))}
                  </CommandGroup>
                )}

                {canCreateNewTag && availableTags.length > 0 && (
                  <CommandGroup>
                    <CommandItem
                      value={`__create__${inputValue}`}
                      onSelect={handleCreateAndAssign}
                      disabled={isCreatingOrAssigning}
                    >
                      <PlusIcon className="size-3.5 mr-2" />
                      Create tag: <span className="font-medium ml-1">"{trimmedInputValue}"</span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {visibleTags.map((tag) => (
        <TagChip key={tag.id} tagId={tag.id} label={tag.label} onRemove={canAssign ? handleRemove : undefined} />
      ))}

      <TagOverflow tags={hiddenTags} onRemove={canAssign ? handleRemove : undefined} />
    </div>
  );
}

interface TagOverflowProps {
  tags: DecryptedCandidateTag[];
  onRemove?: (tagId: string) => void;
}

function TagOverflow({ tags, onRemove }: TagOverflowProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="xs" aria-label={`Show ${tags.length} more tags`}>
          +{tags.length}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-2 p-3">
        <p className="text-xs font-medium text-muted-foreground">More tags</p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <TagChip key={tag.id} tagId={tag.id} label={tag.label} onRemove={onRemove} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface AvailableTagItemProps {
  tag: DecryptedCandidateTag;
  onSelect: (tagId: string) => void;
}

const AvailableTagItem = memo(function AvailableTagItem({ tag, onSelect }: AvailableTagItemProps) {
  const handleSelect = useCallback(() => onSelect(tag.id), [onSelect, tag.id]);

  return (
    <CommandItem value={tag.label} onSelect={handleSelect}>
      {tag.label}
    </CommandItem>
  );
});

function getVisibleTags(tags: DecryptedCandidateTag[], maxVisibleTags: number): DecryptedCandidateTag[] {
  return tags.slice(0, maxVisibleTags);
}

function getHiddenTags(tags: DecryptedCandidateTag[], maxVisibleTags: number): DecryptedCandidateTag[] {
  return tags.slice(maxVisibleTags);
}

interface EmptyStateMessageProps {
  hasArchivedMatch: boolean;
  labelValidation: string | null;
  canCreateNewTag: boolean;
  trimmedInputValue: string;
  onCreate: () => void;
  disabled: boolean;
}

function EmptyStateMessage({
  hasArchivedMatch,
  labelValidation,
  canCreateNewTag,
  trimmedInputValue,
  onCreate,
  disabled,
}: EmptyStateMessageProps) {
  if (hasArchivedMatch) {
    return (
      <div className="px-2 py-3 text-label-12 text-muted-foreground">
        A tag with this name is archived. Restore it in Organization → Candidate Tags.
      </div>
    );
  }

  if (labelValidation) {
    return <div className="px-2 py-3 text-label-12 text-destructive">{labelValidation}</div>;
  }

  if (canCreateNewTag) {
    return (
      <CommandItem value={`__create__${trimmedInputValue}`} onSelect={onCreate} disabled={disabled}>
        <PlusIcon className="size-3.5 mr-2" />
        Create tag: <span className="font-medium ml-1">"{trimmedInputValue}"</span>
      </CommandItem>
    );
  }

  return <div className="px-2 py-3 text-label-12 text-muted-foreground">No matching tags</div>;
}
