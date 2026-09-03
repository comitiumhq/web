import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardFooter } from '@comitium/ui/card';
import { BROWSER_TZ } from '@comitium/ui/date';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Spinner } from '@comitium/ui/spinner';
import { TimezonePicker } from '@comitium/ui/timezone-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EditorToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { EMPTY_DOC, RichTextEditor, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { useUpdateMemberProfile } from '@/hooks/mutations/use-update-member-profile';
import type { OrgMeResponse } from '@/lib/schemas/org';

const profileFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255),
  jobTitle: z.string().trim().max(150).optional().or(z.literal('')),
  timezone: z.string().min(1, 'Timezone is required').max(64),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

function getSubmitLabel(isPending: boolean) {
  return isPending ? 'Saving...' : 'Save changes';
}

interface MyProfileFormProps {
  orgId: string;
  meData: OrgMeResponse;
}

export function MyProfileForm({ orgId, meData }: MyProfileFormProps) {
  const signatureRef = useRef<RichTextEditorHandle | null>(null);
  const { mutate: updateProfile, isPending } = useUpdateMemberProfile(orgId);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: meData.name ?? '',
      jobTitle: meData.jobTitle ?? '',
      timezone: meData.timezone ?? BROWSER_TZ,
    },
  });

  const onSubmit = useCallback(
    (data: ProfileFormData) => {
      const isSignatureEmpty = signatureRef.current?.isEmpty() ?? true;
      const signatureDoc = signatureRef.current?.getJSON() ?? null;

      updateProfile({
        name: data.name,
        jobTitle: data.jobTitle || null,
        emailSignature: isSignatureEmpty ? null : signatureDoc,
        timezone: data.timezone,
      });
    },
    [updateProfile],
  );

  const signatureContent = meData.emailSignature ?? EMPTY_DOC;
  const submitLabel = getSubmitLabel(isPending);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="ring-inset">
          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" className="h-10" maxLength={200} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Recruiter, Engineering Manager"
                        className="h-10"
                        maxLength={150}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <TimezonePicker value={field.value} onChange={field.onChange} className="h-10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <FormLabel>Email signature</FormLabel>
              <RichTextEditor
                content={signatureContent}
                handleRef={signatureRef}
                placeholder="e.g. Jane Doe · Recruiter at Acme Corp · jane@acme.com"
                toolbar={<EditorToolbar />}
                minHeightClass="min-h-40 max-h-72 overflow-y-auto"
              />
            </div>
          </CardContent>

          <CardFooter className="justify-end">
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending && <Spinner data-icon="inline-start" />}
              {submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
