import { ComitiumLogo } from '@comitium/ui/comitium-logo';
import { PageContainer } from '@comitium/ui/page-container';
import { Link } from '@tanstack/react-router';

const FOUNDER_X_URL = 'https://x.com/0xilroy';
const FOUNDER_LINKEDIN_URL = 'https://www.linkedin.com/in/illia-yablonski/';
const GITHUB_URL = 'https://github.com/comitiumhq';

export function PublicFooter() {
  return (
    <footer className="relative z-10 border-t border-separator bg-muted/20">
      <PageContainer className="py-6 sm:py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <Link to="/" className="inline-flex" aria-label="Comitium home">
            <ComitiumLogo />
          </Link>

          <nav className="flex items-center" aria-label="Social links">
            <a
              href={FOUNDER_X_URL}
              target="_blank"
              rel="me noreferrer"
              aria-label="0xilroy on X"
              title="0xilroy on X"
              className="inline-flex size-9 items-center justify-center rounded-md transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <img src="/social/x.svg" alt="" className="size-5 dark:invert" />
            </a>
            <a
              href={FOUNDER_LINKEDIN_URL}
              target="_blank"
              rel="me noreferrer"
              aria-label="Illia Yablonski on LinkedIn"
              title="Illia Yablonski on LinkedIn"
              className="inline-flex size-9 items-center justify-center rounded-md transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <img src="/social/linkedin.svg" alt="" className="size-5" />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="me noreferrer"
              aria-label="Comitium on GitHub"
              title="Comitium on GitHub"
              className="inline-flex size-9 items-center justify-center rounded-md transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <img src="/social/github.svg" alt="" className="size-5 dark:invert" />
            </a>
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
