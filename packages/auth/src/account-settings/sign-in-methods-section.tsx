import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { PageLoader } from '@comitium/ui/page-loader';
import { useSignInMethods } from '../use-sign-in-methods';
import { EmailSignInMethod } from './email-sign-in-method';
import { GoogleSignInMethod } from './google-sign-in-method';
import { PasskeySignInMethod } from './passkey-sign-in-method';

interface SignInMethodsSectionProps {
  queryKey: (userId: string) => readonly unknown[];
}

export function SignInMethodsSection({ queryKey }: SignInMethodsSectionProps) {
  const { methods, error, refreshMethods } = useSignInMethods(queryKey);

  if (error && !methods) {
    throw error;
  }

  if (!methods) {
    return <PageLoader />;
  }

  return (
    <Card size="sm" className="gap-2">
      <CardHeader>
        <CardTitle>
          <h2>Sign-in methods</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-separator p-0">
        <EmailSignInMethod email={methods.email} refreshMethods={refreshMethods} />
        <GoogleSignInMethod methods={methods} refreshMethods={refreshMethods} />
        <PasskeySignInMethod passkeyCount={methods.passkeys.length} refreshMethods={refreshMethods} />
      </CardContent>
    </Card>
  );
}
