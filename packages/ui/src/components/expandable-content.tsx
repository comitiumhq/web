import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { cn } from '../lib/cn';
import { Button } from './button';

interface ExpandableBaseProps {
  collapsedLines?: number;
  className?: string;
  contentClassName?: string;
}

interface ExpandableContentProps extends ExpandableBaseProps {
  children: ReactNode;
}

interface ExpandableTextProps extends ExpandableBaseProps {
  children: string;
}

export function ExpandableContent({
  children,
  collapsedLines = 6,
  className,
  contentClassName,
}: ExpandableContentProps) {
  return (
    <ExpandableFrame
      collapsedLines={collapsedLines}
      className={className}
      contentClassName={contentClassName}
      plainText={false}
    >
      {children}
    </ExpandableFrame>
  );
}

export function ExpandableText({ children, collapsedLines = 4, className, contentClassName }: ExpandableTextProps) {
  return (
    <ExpandableFrame
      collapsedLines={collapsedLines}
      className={className}
      contentClassName={contentClassName}
      plainText
    >
      {children}
    </ExpandableFrame>
  );
}

interface ExpandableFrameProps extends ExpandableBaseProps {
  children: ReactNode;
  plainText: boolean;
}

function ExpandableFrame({
  children,
  collapsedLines = 4,
  className,
  contentClassName,
  plainText,
}: ExpandableFrameProps) {
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  const measureOverflow = useCallback(() => {
    const content = contentRef.current;

    if (!content || isExpanded) {
      return;
    }

    setCanExpand(content.scrollHeight > content.clientHeight + 1);
  }, [isExpanded]);

  useLayoutEffect(() => {
    measureOverflow();

    const content = contentRef.current;

    if (!content || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(content);

    return () => observer.disconnect();
  }, [measureOverflow]);

  const collapsedStyle = useMemo<CSSProperties | undefined>(() => {
    if (isExpanded) {
      return undefined;
    }

    if (plainText) {
      return {
        display: '-webkit-box',
        overflow: 'hidden',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: collapsedLines,
      };
    }

    return {
      maxHeight: `${collapsedLines}lh`,
      overflow: 'hidden',
      ...(canExpand
        ? {
            maskImage: 'linear-gradient(to bottom, black calc(100% - 1lh), transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 1lh), transparent)',
          }
        : {}),
    };
  }, [canExpand, collapsedLines, isExpanded, plainText]);

  const handleToggle = useCallback(() => {
    setIsExpanded((expanded) => !expanded);
  }, []);

  const DisclosureIcon = isExpanded ? CaretUpIcon : CaretDownIcon;

  return (
    <div className={cn('min-w-0', className)}>
      <div id={contentId} ref={contentRef} className={contentClassName} style={collapsedStyle}>
        {children}
      </div>

      {canExpand && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="-ml-2 mt-1 h-6 px-2 text-muted-foreground hover:text-foreground"
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={handleToggle}
        >
          {isExpanded ? 'Show less' : 'Show more'}
          <DisclosureIcon aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
