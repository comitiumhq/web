import { useCryptoUnlock } from '@comitium/auth/use-crypto-unlock';
import { CryptoProxy } from '@comitium/crypto';
import { candidateNoteContext } from '@comitium/crypto/context';
import type { PublicEncryptionKey } from '@comitium/crypto/schemas';
import { Button } from '@comitium/ui/button';
import { Form, FormControl, FormField, FormItem } from '@comitium/ui/form';
import { Switch } from '@comitium/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { LockIcon } from '@phosphor-icons/react';
import { useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { EditorToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { EMPTY_DOC, RichTextEditor, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { useCreateNote } from '@/hooks/mutations/use-create-note';
import { getErrorMessage } from '@/lib/utils';

const noteFormSchema = z.object({
  isPrivate: z.boolean(),
});

type NoteFormData = z.infer<typeof noteFormSchema>;

interface NoteFormProps {
  orgId: string;
  candidateId: string;
  vaultPublicKey: PublicEncryptionKey | null;
  vaultKeyVersion: number | null;
}

export function NoteForm({ orgId, candidateId, vaultPublicKey, vaultKeyVersion }: NoteFormProps) {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const { mutate: createNote, isPending } = useCreateNote();
  const { ensureUnlocked } = useCryptoUnlock();

  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { isPrivate: false },
  });

  const handleSubmit = useCallback(
    async (data: NoteFormData) => {
      if (!editorRef.current || editorRef.current.isEmpty() || !vaultPublicKey || vaultKeyVersion === null) {
        return;
      }

      const doc = editorRef.current.getJSON();

      try {
        await ensureUnlocked();

        const encrypted = await CryptoProxy.encryptApplication(
          vaultPublicKey,
          vaultKeyVersion,
          doc,
          candidateNoteContext(orgId, candidateId),
        );

        createNote(
          {
            candidateId,
            content: encrypted,
            mentions: [],
            isPrivate: data.isPrivate,
          },
          {
            onSuccess: () => {
              editorRef.current?.clear();
              form.reset({ isPrivate: false });
              toast.success('Note added');
            },
            onError: () => {
              toast.error('Failed to add note');
            },
          },
        );
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to encrypt note'));
      }
    },
    [vaultPublicKey, vaultKeyVersion, orgId, candidateId, createNote, form, ensureUnlocked],
  );

  if (!vaultPublicKey) {
    return null;
  }

  return (
    <Form {...form}>
      <div className="flex flex-col gap-2">
        <p className="text-label-13">Add Note</p>

        <RichTextEditor
          content={EMPTY_DOC}
          handleRef={editorRef}
          placeholder="Add a note..."
          toolbar={<EditorToolbar />}
          compact
        />

        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="isPrivate"
            render={({ field }) => (
              <FormItem>
                <fieldset className="flex items-center gap-1.5 cursor-pointer border-0 p-0 m-0">
                  <FormControl>
                    <Switch
                      id="note-private"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="h-4 w-7"
                    />
                  </FormControl>
                  <LockIcon className="size-3 text-muted-foreground" />
                  <label htmlFor="note-private" className="text-label-12 text-muted-foreground cursor-pointer">
                    Private
                  </label>
                </fieldset>
              </FormItem>
            )}
          />

          <Button size="sm" onClick={form.handleSubmit(handleSubmit)} disabled={isPending}>
            {isPending ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>
    </Form>
  );
}
