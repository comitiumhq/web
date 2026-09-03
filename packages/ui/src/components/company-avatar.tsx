import { useCallback, useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { resolveIpfsGatewayUrls } from '../lib/ipfs';
import { Avatar, AvatarFallback } from './avatar';

interface CompanyAvatarProps {
  name?: string | null;
  logo?: string | null;
  size?: 'sm' | 'md';
  className?: string;
  decorative?: boolean;
}

const IMAGE_LOADING_FALLBACK_MS = 700;
type ImageStatus = 'idle' | 'loading' | 'fallback' | 'loaded' | 'error';

export function CompanyAvatar({ name, logo, size = 'md', className, decorative = false }: CompanyAvatarProps) {
  const initials = name?.substring(0, 2).toUpperCase() || 'CO';
  const imageUrls = resolveIpfsGatewayUrls(logo);
  const [gatewayIndex, setGatewayIndex] = useState(0);
  const imageUrl = imageUrls[gatewayIndex] ?? null;
  const [imageStatus, setImageStatus] = useState<ImageStatus>(imageUrl ? 'loading' : 'idle');

  useEffect(() => {
    setGatewayIndex(0);
  }, [logo]);

  useEffect(() => {
    setImageStatus(imageUrl ? 'loading' : 'idle');
  }, [imageUrl]);

  useEffect(() => {
    if (!imageUrl || imageStatus !== 'loading') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setImageStatus('fallback');
    }, IMAGE_LOADING_FALLBACK_MS);

    return () => window.clearTimeout(timeoutId);
  }, [imageStatus, imageUrl]);

  const handleImageLoad = useCallback(() => {
    setImageStatus('loaded');
  }, []);

  const handleImageError = useCallback(() => {
    setGatewayIndex((current) => {
      const next = current + 1;

      if (next >= imageUrls.length) {
        setImageStatus('error');
        return current;
      }

      setImageStatus('loading');
      return next;
    });
  }, [imageUrls.length]);

  const shouldRenderImage = Boolean(imageUrl && imageStatus !== 'error');
  const shouldShowFallback = !imageUrl || imageStatus === 'fallback' || imageStatus === 'error';

  return (
    <Avatar
      aria-hidden={decorative ? true : undefined}
      className={cn(
        'shrink-0 rounded-lg bg-muted after:border-0',
        {
          'size-10': size !== 'sm',
          'size-9': size === 'sm',
        },
        className,
      )}
    >
      {shouldRenderImage && (
        <img
          data-slot="avatar-image"
          src={imageUrl ?? undefined}
          alt={decorative ? '' : (name ?? undefined)}
          className={cn('aspect-square size-full rounded-lg object-cover transition-opacity duration-150', {
            'opacity-0': imageStatus !== 'loaded',
            'opacity-100': imageStatus === 'loaded',
          })}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      {shouldShowFallback && (
        <AvatarFallback className="rounded-lg text-label-12 font-medium">{initials}</AvatarFallback>
      )}
    </Avatar>
  );
}
