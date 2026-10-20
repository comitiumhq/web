import { getErrorMessage } from '@comitium/schemas/error';
import { BackButton } from '@comitium/ui/back-button';
import { Button } from '@comitium/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { PageHeader } from '@comitium/ui/page-header';
import { Spinner } from '@comitium/ui/spinner';
import { VERIFICATION_CODE_LENGTH, VerificationCodeInput } from '@comitium/ui/verification-code-input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSendVerification } from '@/hooks/mutations/use-send-verification';
import { useVerifyCode } from '@/hooks/mutations/use-verify-code';
import { useResendCooldown } from '@/hooks/use-resend-cooldown';

const organizationEmailSchema = z.object({
  email: z.email('Invalid email address').min(1, 'Email is required'),
});

type OrganizationEmailValues = z.infer<typeof organizationEmailSchema>;

export function EmailVerificationStep() {
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const cooldown = useResendCooldown();
  const sendMutation = useSendVerification();
  const verifyMutation = useVerifyCode();

  const form = useForm<OrganizationEmailValues>({
    resolver: zodResolver(organizationEmailSchema),
    defaultValues: { email: '' },
  });

  const emailValue = form.watch('email');

  const handleSendCode = useCallback(
    (data: OrganizationEmailValues) => {
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

  const sendError = sendMutation.error
    ? getErrorMessage(sendMutation.error, 'Could not send the verification code.')
    : null;
  const verifyError = verifyMutation.error
    ? getErrorMessage(verifyMutation.error, 'The verification code is invalid or expired.')
    : null;

  const codeError = verifyError ?? sendError;
  const resendSeconds = cooldown.isActive ? cooldown.remaining : 0;
  const handleCurrentCode = () => handleVerifyCode(code);

  if (codeSent) {
    return (
      <div className="space-y-8">
        <header className="grid gap-3">
          <BackButton onClick={handleChangeEmail} disabled={sendMutation.isPending || verifyMutation.isPending} />
          <PageHeader
            title="Check your inbox"
            description={
              <>
                Enter the 6-digit code sent to <span className="text-foreground">{emailValue}</span>.
              </>
            }
            className="justify-center text-center [&>div]:w-full"
          />
        </header>
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
          {codeError ? (
            <p role="alert" className="text-copy-13 text-destructive-text">
              {codeError}
            </p>
          ) : null}
          <div className="grid gap-3">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={handleCurrentCode}
              disabled={verifyMutation.isPending || code.length !== VERIFICATION_CODE_LENGTH}
            >
              {verifyMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
              {verifyMutation.isPending ? 'Verifying...' : 'Verify email'}
            </Button>
            <Button
              type="button"
              variant="text"
              size="sm"
              className="mx-auto px-0 text-copy-13"
              onClick={handleResendCode}
              disabled={resendSeconds > 0 || sendMutation.isPending || verifyMutation.isPending}
            >
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}
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
          {sendError ? (
            <p role="alert" className="text-copy-13 text-destructive-text">
              {sendError}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={sendMutation.isPending}>
            {sendMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
            {sendMutation.isPending ? 'Sending code...' : 'Send verification code'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
