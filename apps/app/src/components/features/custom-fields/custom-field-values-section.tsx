import { Button } from '@comitium/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { Skeleton } from '@comitium/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comitium/ui/tooltip';
import { LockIcon, PencilIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { useQueryCustomFieldsList } from '@/hooks/queries/use-query-custom-fields-list';
import { useQueryOrgTeam, useQueryOrgTeamMap } from '@/hooks/queries/use-query-org-team';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import type { CustomFieldValueRow as CustomFieldValueRowType } from '@/lib/schemas/candidate-custom-field-values';
import { isDefined } from '@/lib/utils';

import { isCandidateCustomFieldValueTypeSupported } from './candidate-custom-field-value-support';
import { CustomFieldValueDisplay } from './custom-field-value-display';
import { CustomFieldValuesEditSheet } from './custom-field-values-edit-sheet';
import { useDecryptedCustomFieldValues } from './use-decrypted-custom-field-values';

interface CustomFieldValuesSectionProps {
  candidateId: string;
  orgId: string;
  canEdit: boolean;
}

export function CustomFieldValuesSection({ candidateId, orgId, canEdit }: CustomFieldValuesSectionProps) {
  const {
    data: defsResponse,
    isLoading: areDefinitionsLoading,
    isError: areDefinitionsError,
    refetch: refetchDefinitions,
  } = useQueryCustomFieldsList(orgId, {
    objectType: 'candidate',
    includeArchived: false,
  });
  const {
    values,
    decrypted,
    decryptingValueIds,
    failedValueIds,
    isVaultKeyError,
    isLoading: areValuesLoading,
    isQueryError: areValuesError,
    refetch: refetchValues,
  } = useDecryptedCustomFieldValues(candidateId, orgId);
  const { data: team = [] } = useQueryOrgTeam(orgId);
  const teamMap = useQueryOrgTeamMap(orgId);
  const { isUnlocked, runUnlocked } = useEncryptionUnlocked(orgId);

  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleOpenEdit = useCallback(() => runUnlocked(() => setIsEditOpen(true)), [runUnlocked]);
  const handleRetry = useCallback(() => {
    void Promise.all([refetchDefinitions(), refetchValues()]);
  }, [refetchDefinitions, refetchValues]);

  const valueByFieldId = useMemo(() => {
    const map = new Map<string, CustomFieldValueRowType>();

    for (const row of values?.data ?? []) {
      map.set(row.fieldId, row);
    }

    return map;
  }, [values]);

  const definitions = useMemo(
    () => (defsResponse?.data ?? []).filter((def) => isCandidateCustomFieldValueTypeSupported(def.fieldType)),
    [defsResponse?.data],
  );

  if (areDefinitionsLoading || areValuesLoading) {
    return <CustomFieldValuesSkeleton canEdit={canEdit} />;
  }

  if ((areDefinitionsError && !defsResponse) || areValuesError) {
    return <CustomFieldValuesError onRetry={handleRetry} />;
  }

  if (definitions.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Custom fields</CardTitle>

          {canEdit && (
            <CardAction>
              <Button type="button" variant="ghost" size="sm" onClick={handleOpenEdit}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            </CardAction>
          )}
        </CardHeader>

        <CardContent>
          <div className="divide-y divide-border">
            {definitions.map((def) => {
              const valueRow = valueByFieldId.get(def.id);
              const decryptedValue = valueRow ? decrypted[valueRow.id] : undefined;
              const hasValue =
                isDefined(decryptedValue) &&
                decryptedValue !== '' &&
                !(Array.isArray(decryptedValue) && decryptedValue.length === 0);

              return (
                <div
                  key={def.id}
                  className="grid grid-cols-[minmax(7rem,0.45fr)_minmax(0,1fr)] items-baseline gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="break-words text-label-14 text-muted-foreground">{def.title}</span>
                    {def.isPrivate && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <LockIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="top">Private field. Only organization admins can view it.</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="min-w-0">
                    <FieldValueCell
                      hasEncryptedValue={Boolean(valueRow)}
                      hasValue={hasValue}
                      isUnlocked={isUnlocked}
                      isDecrypting={Boolean(valueRow && decryptingValueIds.has(valueRow.id))}
                      decryptionError={Boolean(valueRow && (isVaultKeyError || failedValueIds.has(valueRow.id)))}
                      fieldType={def.fieldType}
                      decryptedValue={decryptedValue}
                      selectableValues={def.selectableValues}
                      teamMap={teamMap}
                      orgId={orgId}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <CustomFieldValuesEditSheet
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          definitions={definitions}
          decryptedValues={decrypted}
          valueByFieldId={valueByFieldId}
          team={team}
          orgId={orgId}
          candidateId={candidateId}
        />
      )}
    </TooltipProvider>
  );
}

function CustomFieldValuesError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Custom fields</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-3">
          <p className="text-xs text-muted-foreground">Custom fields could not be loaded.</p>
          <Button type="button" variant="outline" size="xs" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomFieldValuesSkeleton({ canEdit }: { canEdit: boolean }) {
  return (
    <>
      <output className="sr-only">Loading custom fields</output>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Custom fields</CardTitle>

          {canEdit && (
            <CardAction>
              <Skeleton className="h-8 w-16" />
            </CardAction>
          )}
        </CardHeader>

        <CardContent>
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="grid grid-cols-[minmax(7rem,0.45fr)_minmax(0,1fr)] items-baseline gap-3 py-2 first:pt-0 last:pb-0"
              >
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

interface FieldValueCellProps {
  hasEncryptedValue: boolean;
  hasValue: boolean;
  isUnlocked: boolean;
  isDecrypting: boolean;
  decryptionError: boolean;
  fieldType: Parameters<typeof CustomFieldValueDisplay>[0]['fieldType'];
  decryptedValue: unknown;
  selectableValues: Parameters<typeof CustomFieldValueDisplay>[0]['selectableValues'];
  teamMap: ReturnType<typeof useQueryOrgTeamMap>;
  orgId: string;
}

function FieldValueCell({
  hasEncryptedValue,
  hasValue,
  isUnlocked,
  isDecrypting,
  decryptionError,
  fieldType,
  decryptedValue,
  selectableValues,
  teamMap,
  orgId,
}: FieldValueCellProps) {
  if (!hasEncryptedValue) {
    return <span className="text-copy-14 text-muted-foreground">—</span>;
  }

  if (hasValue) {
    return (
      <CustomFieldValueDisplay
        fieldType={fieldType}
        value={decryptedValue}
        selectableValues={selectableValues}
        teamMap={teamMap}
      />
    );
  }

  if (!isUnlocked) {
    return <EncryptedPlaceholder orgId={orgId} variant="text" />;
  }

  if (isDecrypting) {
    return (
      <span aria-busy className="block py-0.5">
        <span className="sr-only">Decrypting custom field value</span>
        <Skeleton aria-hidden className="h-4 w-1/2 rounded-md" />
      </span>
    );
  }

  if (decryptionError) {
    return <span className="text-copy-14 text-muted-foreground">Could not decrypt</span>;
  }

  return <span className="text-copy-14 text-muted-foreground">—</span>;
}
