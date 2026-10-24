import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardFooter } from '@comitium/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { ImageUploader } from '@comitium/ui/image-uploader';
import { Input } from '@comitium/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@comitium/ui/input-group';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUpRightIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getMyOrigin } from '@/config/site';
import { useUpdateOrgMetadata } from '@/hooks/mutations/use-update-org-metadata';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useQueryOrg } from '@/hooks/queries/use-query-org';
import { usePermissions } from '@/hooks/use-permissions';
import { hasApiErrorStatus } from '@/lib/api/client';
import { CAREERS_SLUG_MAX_LENGTH, suggestCareersSlug } from '@/lib/careers/slugs';
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
  const careersUrlPrefix = `${getMyOrigin()}/careers/`;

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
  const [autoSlug, setAutoSlug] = useState(false);

  useEffect(() => {
    if (!orgDetails) {
      return;
    }

    const needsSlug = !orgDetails.name && orgDetails.careersSlug === `org-${org.id}`;

    form.reset({
      name: orgDetails.name || '',
      careersSlug: needsSlug ? '' : orgDetails.careersSlug,
      description: orgDetails.description || '',
      website: orgDetails.website || '',
    });

    setExistingLogo(orgDetails.logo);
    setAutoSlug(needsSlug);
  }, [orgDetails, org.id, form]);

  const handleImageChange = useCallback((file: File | null) => {
    setLogoFile(file);

    if (!file) {
      setExistingLogo(null);
    }
  }, []);

  const onSubmit = useCallback(
    (data: OrgSettingsFormData) => {
      mutation.mutate(
        {
          name: data.name || '',
          careersSlug: data.careersSlug,
          description: data.description || '',
          website: data.website || '',
          logoFile,
          existingLogo: logoFile ? null : existingLogo,
        },
        {
          onError: (error) => {
            if (hasApiErrorStatus(error, 409)) {
              form.setError('careersSlug', {
                message: 'This address is already taken. Choose another or add a suffix such as -2.',
              });
            }
          },
        },
      );
    },
    [mutation.mutate, logoFile, existingLogo, form],
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
              initialImage={existingLogo}
              acceptedTypes={['image/png', 'image/jpeg', 'image/webp']}
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
                      <Input
                        placeholder="Acme Corp"
                        className="h-10"
                        disabled={isReadOnly}
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          if (autoSlug) {
                            form.setValue('careersSlug', suggestCareersSlug(event.target.value), {
                              shouldDirty: true,
                              shouldValidate: form.formState.isSubmitted,
                            });
                          }
                        }}
                      />
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
                    <FormLabel>Careers page URL</FormLabel>
                    <InputGroup className="h-10">
                      <FormControl>
                        <InputGroupInput
                          placeholder="acme-corp"
                          disabled={isReadOnly}
                          maxLength={CAREERS_SLUG_MAX_LENGTH}
                          autoCapitalize="none"
                          spellCheck={false}
                          {...field}
                          onChange={(event) => {
                            setAutoSlug(false);
                            field.onChange(event);
                          }}
                        />
                      </FormControl>
                      <InputGroupAddon
                        className="h-full min-w-0 shrink cursor-default rounded-l-4xl border-r border-separator bg-foreground/5 px-3 py-0"
                        onClick={undefined}
                      >
                        <span className="truncate">{careersUrlPrefix.replace(/^https?:\/\//, '')}</span>
                      </InputGroupAddon>
                      {orgDetails?.careersSlug && (
                        <InputGroupAddon align="inline-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InputGroupButton
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground"
                                asChild
                              >
                                <a
                                  href={`${careersUrlPrefix}${orgDetails.careersSlug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label="View careers page"
                                >
                                  <ArrowUpRightIcon aria-hidden />
                                </a>
                              </InputGroupButton>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={8}>
                              View careers page
                            </TooltipContent>
                          </Tooltip>
                        </InputGroupAddon>
                      )}
                    </InputGroup>
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
