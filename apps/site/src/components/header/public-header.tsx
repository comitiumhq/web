import { cn } from '@comitium/ui/cn';
import { ComitiumLogo } from '@comitium/ui/comitium-logo';
import { PageContainer } from '@comitium/ui/page-container';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LANDING_CONTAINER_CLASS_NAME } from '@/components/landing/landing-layout';

const headerClassName = 'fixed inset-x-0 top-0 z-40';

export function PublicHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>('[data-app-scroll-container]');
    if (!scrollContainer) return;

    const updateHeaderSurface = () => setIsScrolled(scrollContainer.scrollTop > 16);

    updateHeaderSurface();
    scrollContainer.addEventListener('scroll', updateHeaderSurface, { passive: true });

    return () => scrollContainer.removeEventListener('scroll', updateHeaderSurface);
  }, []);

  return (
    <header className={headerClassName}>
      <div
        className={cn(
          'pointer-events-none absolute inset-0 border-b border-separator bg-background/80 opacity-0 backdrop-blur-md transition-opacity duration-300 ease-out supports-[backdrop-filter]:bg-background/65',
          isScrolled && 'opacity-100',
        )}
        aria-hidden="true"
      />

      <PageContainer className={cn(LANDING_CONTAINER_CLASS_NAME, 'relative flex h-14 items-center')}>
        <Link to="/" className="w-fit shrink-0" aria-label="Comitium home">
          <ComitiumLogo />
        </Link>
      </PageContainer>
    </header>
  );
}
