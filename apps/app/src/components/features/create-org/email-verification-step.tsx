import { getErrorMessage } from '@comitium/schemas/error';
import { Button } from '@comitium/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { PageHeader } from '@comitium/ui/page-header';
import { Spinner } from '@comitium/ui/spinner';
import { VERIFICATION_CODE_LENGTH, VerificationCodeInput } from '@comitium/ui/verification-code-input';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSendVerification } from '@/hooks/mutations/use-send-verification';
import { useVerifyCode } from '@/hooks/mutations/use-verify-code';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';

const emailSchema = z.object({
  email: z.email('Invalid email address').min(1, 'Email is required'),
});

type EmailFormData = z.infer<typeof emailSchema>;

function MutationError({ error, fallback }: { error: Error | null; fallback: string }) {
  if (!error) {
    return null;
  }

  return (
    <p role="alert" className="text-copy-13 text-destructive-text">
      {getErrorMessage(error, fallback)}
    </p>
  );
}

export function EmailVerificationStep() {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const cooldown = useResendCooldown();
  const sendMutation = useSendVerification();
  const verifyMutation = useVerifyCode();

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const emailValue = form.watch('email');

  const handleSendCode = useCallback(
    (data: EmailFormData) => {
      sendMutation.mutate(data.email, {
        onSuccess: (result) => {
          if (result.status === 'verified') {
            return;
          }

          setCodeSent(true);
          cooldown.start();
        },
      });
    },
    [sendMutation, cooldown],
  );

  const handleResendCode = useCallback(() => {
    sendMutation.mutate(emailValue.trim(), {
      onSuccess: (result) => {
        if (result.status === 'verified') {
          return;
        }

        setCode('');
        cooldown.start();
      },
    });
  }, [sendMutation, emailValue, cooldown]);

  const handleVerifyCode = useCallback(
    (verificationCode: string) => {
      if (verificationCode.length !== VERIFICATION_CODE_LENGTH || verifyMutation.isPending) {
        return;
      }

      verifyMutation.mutate({ email: emailValue.trim(), code: verificationCode });
    },
    [emailValue, verifyMutation],
  );

  const handleChangeEmail = useCallback(() => {
    setCodeSent(false);
    setCode('');
    cooldown.reset();
    sendMutation.reset();
    verifyMutation.reset();
  }, [cooldown, sendMutation, verifyMutation]);

  const handleCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      verifyMutation.reset();
    },
    [verifyMutation],
  );

  if (codeSent) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Check your inbox"
          description={
            <>
              Enter the 6-digit code sent to <span className="text-foreground">{emailValue}</span>.
            </>
          }
          className="justify-center text-center [&>div]:w-full"
        />

        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-label-14">Verification code</p>
            <VerificationCodeInput
              value={code}
              onChange={handleCodeChange}
              disabled={verifyMutation.isPending}
              onComplete={handleVerifyCode}
              autoFocus
            />
          </div>

          <MutationError error={verifyMutation.error} fallback="The verification code is invalid or expired." />

          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => handleVerifyCode(code)}
            disabled={verifyMutation.isPending || code.length !== VERIFICATION_CODE_LENGTH}
          >
            {verifyMutation.isPending && <Spinner data-icon="inline-start" />}
            {verifyMutation.isPending ? 'Verifying...' : 'Verify email'}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="-ml-2 text-muted-foreground"
              onClick={handleChangeEmail}
              disabled={sendMutation.isPending || verifyMutation.isPending}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Use another email
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="-mr-2 text-muted-foreground"
              onClick={handleResendCode}
              disabled={cooldown.isActive || sendMutation.isPending || verifyMutation.isPending}
            >
              {cooldown.isActive ? `Resend in ${cooldown.remaining}s` : 'Resend code'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create your organization"
        description="Use your work email to create an organization."
        className="justify-center text-center [&>div]:w-full"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSendCode)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    size="lg"
                    placeholder="you@company.com"
                    autoComplete="email"
                    inputMode="email"
                    autoFocus
                    disabled={sendMutation.isPending}
                    {...field}
                    onChange={(event) => {
                      field.onChange(event);
                      sendMutation.reset();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <MutationError error={sendMutation.error} fallback="Could not send the verification code." />

          <Button type="submit" size="lg" className="w-full" disabled={sendMutation.isPending}>
            {sendMutation.isPending && <Spinner data-icon="inline-start" />}
            {sendMutation.isPending ? 'Sending...' : 'Continue'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
