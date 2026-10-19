import { Card, CardContent, CardHeader, CardTitle } from '@comitium/ui/card';
import { PageHeader } from '@comitium/ui/page-header';
import { PageLoader } from '@comitium/ui/page-loader';
import { useSignInMethods } from '../use-sign-in-methods';
import { EmailSignInMethod } from './email-sign-in-method';
import { GoogleSignInMethod } from './google-sign-in-method';
import { PasskeySignInMethod } from './passkey-sign-in-method';

export function AuthenticationSettingsPage({ queryKey }: { queryKey: (userId: string) => readonly unknown[] }) {
  const { methods, error, refreshMethods } = useSignInMethods(queryKey);

  if (error && !methods) {
    throw error;
  }

  if (!methods) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Authentication" />
      <Card size="sm" className="gap-2">
        <CardHeader>
          <CardTitle>Sign-in methods</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-separator p-0">
          <EmailSignInMethod email={methods.email} refreshMethods={refreshMethods} />
          <GoogleSignInMethod methods={methods} refreshMethods={refreshMethods} />
          <PasskeySignInMethod passkeyCount={methods.passkeys.length} refreshMethods={refreshMethods} />
        </CardContent>
      </Card>
    </div>
  );
}
