import { ComitiumLogo } from '@comitium/ui/comitium-logo';
import { Link, useRouterState } from '@tanstack/react-router';

import { CandidateAccountControls } from './candidate-account-controls';
import { PublicNav } from './public-nav';

const publicHeaderClassName =
  'fixed top-0 left-0 z-40 w-full border-b border-border bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/65';

export function PublicHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <header className={publicHeaderClassName}>
      <div className="flex h-14 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-5">
          <Link to="/jobs" className="shrink-0">
            <ComitiumLogo />
          </Link>

          <PublicNav pathname={pathname} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CandidateAccountControls />
        </div>
      </div>
    </header>
  );
}
