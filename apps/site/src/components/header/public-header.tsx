import { cn } from '@comitium/ui/cn';
import { ComitiumLogo } from '@comitium/ui/comitium-logo';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

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
          'pointer-events-none absolute inset-0 border-b border-border bg-background/80 opacity-0 backdrop-blur-md transition-opacity duration-300 ease-out supports-[backdrop-filter]:bg-background/65',
          isScrolled && 'opacity-100',
        )}
        aria-hidden="true"
      />

      <div className="relative flex h-14 items-center px-5 sm:px-8 lg:px-16">
        <Link to="/" className="w-fit shrink-0" aria-label="Comitium home">
          <ComitiumLogo />
        </Link>
      </div>
    </header>
  );
}
