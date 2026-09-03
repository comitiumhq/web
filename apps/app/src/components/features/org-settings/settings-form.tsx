import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardFooter } from '@comitium/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { ImageUploader } from '@comitium/ui/image-uploader';
import { Input } from '@comitium/ui/input';
import { resolveIpfsUrl } from '@comitium/ui/ipfs';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { Textarea } from '@comitium/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useUpdateOrgMetadata } from '@/hooks/mutations/use-update-org-metadata';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrg } from '@/hooks/queries/use-query-org';
import { usePermissions } from '@/hooks/use-permissions';
import { MAX_FILE_UPLOAD_SIZE } from '@/lib/constants/ui-config';
import { Permission } from '@/lib/schemas/org';
import { type OrgSettingsFormData, orgSettingsSchema } from '@/lib/schemas/org-settings-form';

interface SettingsFormProps {
  org: MyOrg;
}

function getSaveLabel(isPending: boolean): string {
  if (isPending) {
    return 'Saving...';
  }

  return 'Save changes';
}

export function SettingsForm({ org }: SettingsFormProps) {
  const { can } = usePermissions();
  const { data: orgDetails, isLoading } = useQueryOrg(org.id);
  const mutation = useUpdateOrgMetadata(org.id);

  const canManageProfile = can(Permission.ORG_SETTINGS_WRITE);
  const isReadOnly = !canManageProfile;

  const form = useForm<OrgSettingsFormData>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      name: '',
      careersSlug: '',
      description: '',
      website: '',
    },
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [existingLogo, setExistingLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!orgDetails) {
      return;
    }

    form.reset({
      name: orgDetails.name || '',
      careersSlug: orgDetails.careersSlug || '',
      description: orgDetails.description || '',
      website: orgDetails.website || '',
    });

    if (orgDetails.logo) {
      setExistingLogo(orgDetails.logo);
    }
  }, [orgDetails, form]);

  const handleImageChange = useCallback((file: File | null) => {
    setLogoFile(file);

    if (!file) {
      setExistingLogo(null);
    }
  }, []);

  const onSubmit = useCallback(
    (data: OrgSettingsFormData) => {
      mutation.mutate({
        name: data.name || '',
        careersSlug: data.careersSlug,
        description: data.description || '',
        website: data.website || '',
        logoFile,
        existingLogo: logoFile ? null : existingLogo,
      });
    },
    [mutation.mutate, logoFile, existingLogo],
  );

  const saveLabel = getSaveLabel(mutation.isPending);

  if (isLoading) {
    return (
      <Card className="ring-inset">
        <CardContent className="grid grid-cols-1 gap-8 lg:grid-cols-[10rem_1fr]">
          <div className="flex flex-col gap-2">
            <Skeleton className="size-40 rounded-xl" />
            <Skeleton className="h-4 w-36" />
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-4xl" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-4xl" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-4xl" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Skeleton className="h-9 w-full rounded-full sm:w-32" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="ring-inset">
          <CardContent className="grid grid-cols-1 gap-8 lg:grid-cols-[10rem_1fr]">
            <ImageUploader
              label="Company logo"
              size="size-40"
              disabled={isReadOnly}
              initialImage={existingLogo ? (resolveIpfsUrl(existingLogo) ?? null) : null}
              maxSize={MAX_FILE_UPLOAD_SIZE}
              onImageChange={handleImageChange}
            />

            <div className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" className="h-10" disabled={isReadOnly} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="url"
                        placeholder="https://company.com"
                        className="h-10"
                        disabled={isReadOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="careersSlug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Public slug</FormLabel>
                    <FormControl>
                      <Input placeholder="acme" className="h-10" disabled={isReadOnly} {...field} />
                    </FormControl>
                    <FormDescription>Used in your public careers URL.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About the company</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell about your company."
                        rows={8}
                        className="min-h-40"
                        disabled={isReadOnly}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>

          {canManageProfile && (
            <CardFooter className="justify-end">
              <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
                {mutation.isPending && <Spinner data-icon="inline-start" />}
                {saveLabel}
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>
    </Form>
  );
}
