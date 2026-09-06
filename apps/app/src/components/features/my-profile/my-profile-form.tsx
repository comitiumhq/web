import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardFooter } from '@comitium/ui/card';
import { BROWSER_TZ } from '@comitium/ui/date';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Spinner } from '@comitium/ui/spinner';
import { TimezonePicker } from '@comitium/ui/timezone-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EditorToolbar } from '@/components/tiptap-ui/editor-toolbars';
import { EMPTY_DOC, RichTextEditor, type RichTextEditorHandle } from '@/components/tiptap-ui/rich-text-editor';
import { useUpdateMemberAvatar } from '@/hooks/mutations/use-update-member-avatar';
import { useUpdateMemberProfile } from '@/hooks/mutations/use-update-member-profile';
import { useMemberAvatar } from '@/hooks/queries/use-member-avatar';
import { MAX_FILE_UPLOAD_SIZE } from '@/lib/constants/ui-config';
import type { OrgMeResponse } from '@/lib/schemas/org';
import { ProfilePhotoField } from './profile-photo-field';

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
  const [signatureDirty, setSignatureDirty] = useState(false);
  const { mutate: updateProfile, isPending } = useUpdateMemberProfile(orgId);
  const avatarMutation = useUpdateMemberAvatar(orgId);
  const avatarImage = useMemberAvatar(meData.avatarUrl);

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

      updateProfile(
        {
          name: data.name,
          jobTitle: data.jobTitle || null,
          emailSignature: isSignatureEmpty ? null : signatureDoc,
          timezone: data.timezone,
        },
        {
          onSuccess: () => {
            form.reset(data);
            setSignatureDirty(false);
          },
        },
      );
    },
    [form, updateProfile],
  );

  const signatureContent = meData.emailSignature ?? EMPTY_DOC;
  const submitLabel = getSubmitLabel(isPending);
  const isDirty = form.formState.isDirty || signatureDirty;
  const handleSignatureUpdate = useCallback(() => setSignatureDirty(true), []);
  const handleAvatarChange = useCallback(
    (upload: Parameters<typeof avatarMutation.mutate>[0]) => {
      avatarMutation.mutate(upload);
    },
    [avatarMutation.mutate],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="ring-inset">
          <CardContent className="flex min-w-0 flex-col gap-6">
            <ProfilePhotoField
              name={meData.name}
              email={meData.email}
              imageSrc={avatarImage}
              maxSize={MAX_FILE_UPLOAD_SIZE}
              disabled={avatarMutation.isPending}
              onChange={handleAvatarChange}
            />

            <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" className="h-10" maxLength={255} {...field} />
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
                    <FormLabel>Job title</FormLabel>
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

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Time zone</FormLabel>
                    <FormControl>
                      <TimezonePicker value={field.value} onChange={field.onChange} className="h-10" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FormLabel>Email signature</FormLabel>
              <RichTextEditor
                content={signatureContent}
                handleRef={signatureRef}
                placeholder="e.g. Jane Doe · Recruiter at Acme Corp · jane@acme.com"
                toolbar={<EditorToolbar />}
                minHeightClass="min-h-32 max-h-56 overflow-y-auto"
                debounceMs={0}
                onUpdate={handleSignatureUpdate}
              />
            </div>
          </CardContent>

          <CardFooter className="justify-end">
            <Button type="submit" disabled={!isDirty || isPending} className="w-full sm:w-auto">
              {isPending && <Spinner data-icon="inline-start" />}
              {submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
