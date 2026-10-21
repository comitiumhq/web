import { PageHeader } from '@comitium/ui/page-header';

import { SignInMethodsSection } from './sign-in-methods-section';

interface AuthenticationSettingsPageProps {
  queryKey: (userId: string) => readonly unknown[];
}

export function AuthenticationSettingsPage({ queryKey }: AuthenticationSettingsPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Authentication" />
      <SignInMethodsSection queryKey={queryKey} />
    </div>
  );
}
