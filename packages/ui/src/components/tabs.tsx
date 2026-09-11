'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/cn';

function Tabs({ className, orientation = 'horizontal', ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn('group/tabs flex gap-2 data-horizontal:flex-col', className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'group/tabs-list relative isolate inline-flex w-fit items-center justify-center rounded-4xl p-[3px] text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:rounded-2xl data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'border border-control-border bg-segment-track bg-clip-padding',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ref,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const indicatorRef = React.useRef<HTMLSpanElement | null>(null);

  const setListRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      setRef(ref, node);
    },
    [ref],
  );

  React.useLayoutEffect(() => {
    if (variant !== 'default') {
      return;
    }

    const list = listRef.current;
    const indicator = indicatorRef.current;

    if (!list || !indicator) {
      return;
    }

    let initialFrame = 0;

    const updateIndicator = () => {
      const activeTrigger = list.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]');

      if (!activeTrigger) {
        indicator.style.opacity = '0';
        return;
      }

      const isInitialPosition = indicator.dataset.ready !== 'true';

      if (isInitialPosition) {
        indicator.style.transition = 'none';
      }

      indicator.style.width = `${activeTrigger.offsetWidth}px`;
      indicator.style.height = `${activeTrigger.offsetHeight}px`;
      indicator.style.transform = `translate3d(${activeTrigger.offsetLeft}px, ${activeTrigger.offsetTop}px, 0)`;
      indicator.style.opacity = '1';

      if (isInitialPosition) {
        initialFrame = window.requestAnimationFrame(() => {
          indicator.dataset.ready = 'true';
          indicator.style.removeProperty('transition');
        });
      }
    };

    const resizeObserver = new ResizeObserver(updateIndicator);
    const observeTriggers = () => {
      for (const trigger of list.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]')) {
        resizeObserver.observe(trigger);
      }
    };
    const mutationObserver = new MutationObserver(() => {
      observeTriggers();
      updateIndicator();
    });

    observeTriggers();
    updateIndicator();
    resizeObserver.observe(list);
    mutationObserver.observe(list, {
      attributeFilter: ['data-state'],
      attributes: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener('resize', updateIndicator);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.removeEventListener('resize', updateIndicator);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [variant]);

  return (
    <TabsPrimitive.List
      ref={setListRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {variant === 'default' && (
        <span
          ref={indicatorRef}
          data-slot="tabs-indicator"
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-0 rounded-3xl bg-segment opacity-0 shadow-[var(--segment-shadow)] transition-[transform,width,height,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none"
        />
      )}
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-normal whitespace-nowrap text-foreground/60 transition-colors duration-200 ease-out group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:px-2.5 group-data-vertical/tabs:py-1.5 hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:ring-0 group-data-[variant=line]/tabs-list:data-active:shadow-none',
        'data-active:text-foreground dark:data-active:text-foreground',
        'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  );
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
