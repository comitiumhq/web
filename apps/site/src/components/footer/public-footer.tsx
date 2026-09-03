import { Button } from '@comitium/ui/button';
import { ComitiumLogo } from '@comitium/ui/comitium-logo';
import { PageContainer } from '@comitium/ui/page-container';
import { GithubLogoIcon, XLogoIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';

const FOUNDER_X_URL = 'https://x.com/0xilroy';
const GITHUB_URL = 'https://github.com/comitiumhq';

export function PublicFooter() {
  return (
    <footer className="relative z-10 border-t border-border bg-muted/20">
      <PageContainer className="py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <Link to="/" className="inline-flex" aria-label="Comitium home">
            <ComitiumLogo />
          </Link>

          <nav className="flex items-center gap-1" aria-label="Social links">
            <Button asChild variant="outline" size="icon-sm">
              <a
                href={FOUNDER_X_URL}
                target="_blank"
                rel="me noreferrer"
                aria-label="0xilroy on X"
                title="0xilroy on X"
              >
                <XLogoIcon className="size-5" aria-hidden="true" />
              </a>
            </Button>
            <Button asChild variant="outline" size="icon-sm">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="me noreferrer"
                aria-label="Comitium on GitHub"
                title="Comitium on GitHub"
              >
                <GithubLogoIcon className="size-5" aria-hidden="true" />
              </a>
            </Button>
          </nav>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-copy-14 text-muted-foreground">© 2026 Comitium</p>

          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label="Company information">
            <Link to="/encryption" className="text-copy-14 text-muted-foreground hover:text-foreground">
              Encryption
            </Link>
            <Link to="/privacy" className="text-copy-14 text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="text-copy-14 text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link to="/ai-terms" className="text-copy-14 text-muted-foreground hover:text-foreground">
              AI Terms
            </Link>
            <Link to="/dpa" className="text-copy-14 text-muted-foreground hover:text-foreground">
              DPA
            </Link>
          </nav>
        </div>
      </PageContainer>
    </footer>
  );
}
