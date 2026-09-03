import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useInviteMembers } from '@/hooks/mutations/use-invite-members';

const inviteFormSchema = z.object({
  name: z.string().trim().min(1, 'Required').max(255),
  email: z.email('Invalid email').max(255),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

interface InviteDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteSheet({ orgId, open, onOpenChange }: InviteDialogProps) {
  const { mutate: inviteMembers, isPending } = useInviteMembers();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { name: '', email: '' },
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isPending) {
        return;
      }

      if (!next) {
        form.reset();
      }

      onOpenChange(next);
    },
    [isPending, form, onOpenChange],
  );

  const onSubmit = useCallback(
    (data: InviteFormData) => {
      inviteMembers(
        { orgId, invites: [{ email: data.email, name: data.name }] },
        {
          onSuccess: () => {
            form.reset();
            onOpenChange(false);
          },
        },
      );
    },
    [orgId, inviteMembers, form, onOpenChange],
  );

  const handleCancel = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-heading-20">Invite member</DialogTitle>
          <DialogDescription>Grant roles after the invite is accepted.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="invite-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" autoComplete="name" size="lg" disabled={isPending} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      autoComplete="email"
                      size="lg"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" disabled={isPending}>
            {isPending && <Spinner data-icon="inline-start" />}
            {isPending ? 'Sending...' : 'Send invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
