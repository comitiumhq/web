import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateCandidateTag, useRenameCandidateTag } from '@/hooks/mutations/use-candidate-tag';
import { useQueryOrgVaultKey } from '@/hooks/queries/use-query-org-vault-key';
import { useQueryWrappedVaultKey } from '@/hooks/queries/use-query-wrapped-vault-key';
import { type DecryptedCandidateTag, TAG_LABEL_MAX, tagLabelFieldSchema } from '@/lib/schemas/candidate-tags';

const tagFormSchema = z.object({
  label: tagLabelFieldSchema,
});

type TagFormData = z.infer<typeof tagFormSchema>;

function getSubmitLabel(isPending: boolean, isEdit: boolean) {
  if (isPending) {
    return isEdit ? 'Saving...' : 'Creating...';
  }

  return isEdit ? 'Save' : 'Create tag';
}

interface TagEditDialogProps {
  orgId: string;
  tag: DecryptedCandidateTag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagEditDialog({ orgId, tag, open, onOpenChange }: TagEditDialogProps) {
  const { data: vaultKey } = useQueryOrgVaultKey(orgId);
  const { data: wrappedVaultKey } = useQueryWrappedVaultKey(orgId);
  const createMutation = useCreateCandidateTag();
  const renameMutation = useRenameCandidateTag();

  const isEdit = tag !== null;
  const isPending = createMutation.isPending || renameMutation.isPending;
  const hasKeys = !!vaultKey?.vaultPublicKey && !!wrappedVaultKey;

  const form = useForm<TagFormData>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: { label: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ label: tag?.label ?? '' });
    }
  }, [open, tag, form]);

  const onSubmit = useCallback(
    async (data: TagFormData) => {
      if (!vaultKey?.vaultPublicKey || !wrappedVaultKey) {
        return;
      }

      if (isEdit && tag) {
        await renameMutation.mutateAsync({
          orgId,
          tagId: tag.id,
          label: data.label,
          vaultPublicKey: vaultKey.vaultPublicKey,
          vaultKeyVersion: vaultKey.keyVersion,
          wrappedVaultKey,
        });
      } else {
        await createMutation.mutateAsync({
          orgId,
          label: data.label,
          vaultPublicKey: vaultKey.vaultPublicKey,
          vaultKeyVersion: vaultKey.keyVersion,
          wrappedVaultKey,
        });
      }

      onOpenChange(false);
    },
    [createMutation, isEdit, onOpenChange, orgId, renameMutation, tag, vaultKey?.vaultPublicKey, wrappedVaultKey],
  );

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const currentValue = form.watch('label');
  const currentLength = currentValue.trim().length;
  const submitLabel = getSubmitLabel(isPending, isEdit);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rename tag' : 'New tag'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tag name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. senior-backend, needs-review"
                      maxLength={TAG_LABEL_MAX}
                      autoFocus
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <FormDescription>Letters, numbers, spaces, and - _ . only</FormDescription>
                      <FormMessage />
                    </div>
                    {currentLength > 0 && (
                      <span className="font-mono text-label-12 text-muted-foreground shrink-0">
                        {currentLength} / {TAG_LABEL_MAX}
                      </span>
                    )}
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !hasKeys}>
                {isPending && <Spinner data-icon="inline-start" />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
