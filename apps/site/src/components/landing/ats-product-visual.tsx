import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { cn } from '@comitium/ui/cn';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { KanbanCardBody, KanbanColumnHeader } from '@comitium/ui/kanban';
import { StatusBadge } from '@comitium/ui/status-badge';
import { CalendarPlusIcon, ChatCenteredTextIcon, ClipboardTextIcon } from '@phosphor-icons/react';
import type { AnimationSequence } from 'motion/react';
import type { CSSProperties } from 'react';
import { ProductDemoCursor } from './product-demo-cursor';
import { useProductDemoPlayback } from './use-product-demo-playback';

const columnHeadingClassName = cn(
  'ats-demo-column-heading relative h-6 mb-2 [&>_.ats-demo-before-move]:absolute',
  '[&>_.ats-demo-after-move]:absolute [&>_.ats-demo-before-move]:inset-0 [&>_.ats-demo-after-move]:inset-0',
  '[&_[data-slot=kanban-column-name]]:text-[11px] [&_[data-slot=kanban-column-name]]:leading-[16px]',
  '[&_[data-slot=badge]]:h-4 [&_[data-slot=badge]]:px-[5px] [&_[data-slot=badge]]:text-[9px]',
  '[&_[data-slot=kanban-column-header]]:gap-[5px] [&_[data-slot=kanban-column-header]]:m-0',
  '[&_[data-slot=kanban-column-header]]:pt-[3px] [&_[data-slot=kanban-column-header]]:px-0.5',
  '[&_[data-slot=kanban-column-header]]:pb-0 @max-[360px]/ats-demo:[&_[data-slot=badge]]:hidden',
  '@max-[360px]/ats-demo:[&_[data-slot=kanban-column-name]]:text-[10px]',
);

const miniCardClassName = cn(
  'ats-demo-mini-card relative flex h-21 flex-none gap-0 p-2.5 border-0 rounded-[11px] bg-card',
  '[&_[data-slot=kanban-card-name]]:text-[12px] [&_[data-slot=kanban-card-name]]:leading-[16px]',
  '[&_[data-slot=kanban-card-name]]:tracking-[-0.015em] [&_[data-slot=kanban-card-company]]:text-[10px]',
  '[&_[data-slot=kanban-card-company]]:leading-[13px] [&_[data-slot=kanban-card-status]]:mt-2',
  '[&_[data-slot=badge]]:max-w-full [&_[data-slot=badge]]:h-4.5 [&_[data-slot=badge]]:overflow-hidden',
  '[&_[data-slot=badge]]:px-1.5 [&_[data-slot=badge]]:text-[9px] @max-[360px]/ats-demo:py-2.5',
  '@max-[360px]/ats-demo:px-[7px] @max-[360px]/ats-demo:[&_[data-slot=badge]]:hidden',
);

const tabsClassName = cn(
  'ats-demo-tabs grid h-7 grid-cols-3 gap-1 mt-1 mx-4 mb-0 p-[3px] rounded-[20px] bg-muted',
  'text-muted-foreground text-[10px] leading-[16px] text-center [&>_span]:grid [&>_span]:place-items-center',
  '[&>_span]:rounded-[inherit] [&>_span[data-active=true]]:bg-card',
  '[&>_span[data-active=true]]:text-foreground',
);

const panelClassName = cn(
  'absolute top-0 right-0 w-80 max-w-full gap-0 p-0 border-0 rounded-[22px] bg-card overflow-hidden',
  'text-[12px] leading-[calc(20/14)] @max-[520px]/ats-demo:right-[50%] @max-[520px]/ats-demo:mr-[-160px]',
  '@max-[360px]/ats-demo:right-0 @max-[360px]/ats-demo:mr-0',
);

const actionClassName = 'h-6.5 px-[11px] text-[10px] leading-[calc(4/3)] transition-none';

function createSequence(): AnimationSequence {
  const feedbackOffset = 2.2;
  const stageMoveStart = feedbackOffset + 5.2;

  return [
    ['.ats-demo-review-board-pointer', { opacity: 1, x: 0, y: 0 }, { at: 0.55, duration: 0.35 }],
    ['.ats-demo-review-board-pointer', { scale: 0.86 }, { at: 1.05, duration: 0.12 }],
    ['.ats-demo-card-selection', { opacity: 1 }, { at: 1.05, duration: 0.15 }],
    ['.ats-demo-review-board-pointer', { opacity: 0, scale: 1 }, { at: 1.2, duration: 0.15 }],
    ['.ats-demo-board', { x: -20, scale: 0.95 }, { at: 1.25, duration: 0.4 }],
    ['.ats-demo-review-sheet', { opacity: 1, x: 0 }, { at: 1.35, duration: 0.4 }],
    ['.ats-demo-review-sheet-pointer', { opacity: 1, x: 0, y: 0 }, { at: 1.95, duration: 0.35 }],
    ['.ats-demo-review-sheet-pointer', { scale: 0.86 }, { at: 2.55, duration: 0.12 }],
    ['.ats-demo-open-feedback', { scale: 0.97 }, { at: 2.55, duration: 0.12 }],
    ['.ats-demo-review-sheet-pointer', { opacity: 0, scale: 1 }, { at: 2.7, duration: 0.15 }],
    ['.ats-demo-review-sheet', { opacity: 0 }, { at: feedbackOffset + 0.65, duration: 0.2 }],
    ['.ats-demo-feedback', { opacity: 1, x: 0 }, { at: feedbackOffset + 0.65, duration: 0.45 }],
    ['.ats-demo-feedback-pointer', { opacity: 1, x: 0, y: 0 }, { at: feedbackOffset + 1.2, duration: 0.35 }],
    ['.ats-demo-feedback-pointer', { scale: 0.86 }, { at: feedbackOffset + 1.65, duration: 0.12 }],
    ['.ats-demo-recommendation-selected', { opacity: 1 }, { at: feedbackOffset + 1.65, duration: 0.2 }],
    ['.ats-demo-feedback-pointer', { scale: 1, x: -50, y: 83 }, { at: feedbackOffset + 1.9, duration: 0.4 }],
    ['.ats-demo-feedback-pointer', { scale: 0.86 }, { at: feedbackOffset + 2.3, duration: 0.12 }],
    ['.ats-demo-notes-focus', { opacity: 1 }, { at: feedbackOffset + 2.3, duration: 0.16 }],
    ['.ats-demo-feedback-pointer', { scale: 1 }, { at: feedbackOffset + 2.45, duration: 0.12 }],
    [
      '.ats-demo-notes-first-line',
      { clipPath: 'inset(0 0% 0 0)' },
      { at: feedbackOffset + 2.45, duration: 0.6, ease: 'linear' },
    ],
    [
      '.ats-demo-notes-second-line',
      { clipPath: 'inset(0 0% 0 0)' },
      { at: feedbackOffset + 3.05, duration: 0.6, ease: 'linear' },
    ],
    ['.ats-demo-feedback-pointer', { x: 110, y: 117 }, { at: feedbackOffset + 3.65, duration: 0.4 }],
    ['.ats-demo-feedback-pointer', { scale: 0.86 }, { at: feedbackOffset + 4.15, duration: 0.12 }],
    ['.ats-demo-submit-feedback', { scale: 0.97 }, { at: feedbackOffset + 4.15, duration: 0.12 }],
    ['.ats-demo-notes-focus', { opacity: 0 }, { at: feedbackOffset + 4.15, duration: 0.2 }],
    ['.ats-demo-review-pending', { opacity: 0 }, { at: feedbackOffset + 4.3, duration: 0.15 }],
    ['.ats-demo-review-complete', { opacity: 1 }, { at: feedbackOffset + 4.3, duration: 0.2 }],
    ['.ats-demo-feedback-pointer', { opacity: 0, scale: 1 }, { at: feedbackOffset + 4.35, duration: 0.2 }],
    ['.ats-demo-feedback', { opacity: 0, x: 16 }, { at: feedbackOffset + 4.65, duration: 0.3 }],
    ['.ats-demo-card-selection', { opacity: 0 }, { at: feedbackOffset + 4.65, duration: 0.2 }],
    ['.ats-demo-board', { x: 0, scale: 1 }, { at: feedbackOffset + 4.65, duration: 0.4 }],
    ['.ats-demo-board-pointer', { opacity: 1, x: 0, y: 0 }, { at: stageMoveStart + 0.8, duration: 0.4 }],
    ['.ats-demo-board-pointer', { scale: 0.86 }, { at: stageMoveStart + 1.3, duration: 0.12 }],
    ['.ats-demo-moving-card', { y: -7, rotate: -2, scale: 1.03 }, { at: stageMoveStart + 1.45, duration: 0.2 }],
    ['.ats-demo-drop-target', { opacity: 1 }, { at: stageMoveStart + 1.5, duration: 0.2 }],
    ['.ats-demo-lucia', { y: 92 }, { at: stageMoveStart + 1.6, duration: 0.4 }],
    ['.ats-demo-board', { '--ats-demo-drag-progress': 1 }, { at: stageMoveStart + 1.7, duration: 0.85 }],
    ['.ats-demo-board-pointer', { scale: 1 }, { at: stageMoveStart + 2.55, duration: 0.15 }],
    ['.ats-demo-moving-card', { y: 0, rotate: 0, scale: 1 }, { at: stageMoveStart + 2.55, duration: 0.25 }],
    ['.ats-demo-sofia', { y: -92 }, { at: stageMoveStart + 2.55, duration: 0.35 }],
    ['.ats-demo-drop-target', { opacity: 0 }, { at: stageMoveStart + 2.7, duration: 0.2 }],
    ['.ats-demo-before-move', { opacity: 0 }, { at: stageMoveStart + 2.7, duration: 0.15 }],
    ['.ats-demo-after-move', { opacity: 1 }, { at: stageMoveStart + 2.7, duration: 0.2 }],
    ['.ats-demo-board-pointer', { scale: 0.86 }, { at: stageMoveStart + 3.05, duration: 0.12 }],
    ['.ats-demo-card-selection', { opacity: 1 }, { at: stageMoveStart + 3.05, duration: 0.15 }],
    ['.ats-demo-board-pointer', { opacity: 0, scale: 1 }, { at: stageMoveStart + 3.25, duration: 0.2 }],
    ['.ats-demo-board', { x: -20, scale: 0.95 }, { at: stageMoveStart + 3.35, duration: 0.45 }],
    ['.ats-demo-sheet', { opacity: 1, x: 0 }, { at: stageMoveStart + 3.45, duration: 0.45 }],
    ['.ats-demo-sheet-pointer', { opacity: 1, x: 0, y: 0 }, { at: stageMoveStart + 4.2, duration: 0.4 }],
    ['.ats-demo-sheet-pointer', { scale: 0.86 }, { at: stageMoveStart + 4.85, duration: 0.12 }],
    ['.ats-demo-send-link', { scale: 0.97 }, { at: stageMoveStart + 4.85, duration: 0.12 }],
    [
      '.ats-demo-activity-actions, .ats-demo-before-send',
      { opacity: 0 },
      { at: stageMoveStart + 5.05, duration: 0.16, ease: 'easeInOut' },
    ],
    [
      '.ats-demo-booking-provider, .ats-demo-after-send',
      { opacity: 1 },
      { at: stageMoveStart + 5.21, duration: 0.32, ease: 'easeInOut' },
    ],
    [
      '.ats-demo-sheet-pointer',
      { opacity: 0, scale: 1 },
      { at: stageMoveStart + 5.05, duration: 0.16, ease: 'easeInOut' },
    ],
    [
      '.ats-demo-scene',
      { '--ats-demo-reset-opacity': 1 },
      { at: stageMoveStart + 9.55, duration: 0.3, ease: 'easeInOut' },
    ],
    ['.ats-demo-sheet', { opacity: 0, x: 24 }, { at: stageMoveStart + 9.85, duration: 0.35 }],
    ['.ats-demo-board', { x: 0, scale: 1 }, { at: stageMoveStart + 9.85, duration: 0.35 }],
    // Keep the board surface visible and reset its contents under the white transition.
    ['.ats-demo-board', { '--ats-demo-drag-progress': 0 }, { at: stageMoveStart + 10.1, duration: 0.01 }],
    ['.ats-demo-lucia', { y: 0 }, { at: stageMoveStart + 10.1, duration: 0.01 }],
    ['.ats-demo-sofia', { y: 0 }, { at: stageMoveStart + 10.1, duration: 0.01 }],
    [
      '.ats-demo-after-move, .ats-demo-card-selection, .ats-demo-after-send, .ats-demo-booking-provider',
      { opacity: 0 },
      { at: stageMoveStart + 10.1, duration: 0.01 },
    ],
    [
      '.ats-demo-before-move, .ats-demo-before-send, .ats-demo-activity-actions',
      { opacity: 1 },
      { at: stageMoveStart + 10.1, duration: 0.01 },
    ],
    ['.ats-demo-review-pending', { opacity: 1 }, { at: stageMoveStart + 10.1, duration: 0.01 }],
    [
      '.ats-demo-review-complete, .ats-demo-recommendation-selected, .ats-demo-notes-focus',
      { opacity: 0 },
      { at: stageMoveStart + 10.1, duration: 0.01 },
    ],
    [
      '.ats-demo-notes-first-line, .ats-demo-notes-second-line',
      { clipPath: 'inset(0 100% 0 0)' },
      { at: stageMoveStart + 10.1, duration: 0.01 },
    ],
    ['.ats-demo-feedback, .ats-demo-review-sheet', { x: 24 }, { at: stageMoveStart + 10.1, duration: 0.01 }],
    ['.ats-demo-submit-feedback, .ats-demo-open-feedback', { scale: 1 }, { at: stageMoveStart + 10.1, duration: 0.01 }],
    [
      '.ats-demo-feedback-pointer, .ats-demo-review-board-pointer, .ats-demo-review-sheet-pointer',
      { opacity: 0, x: 12, y: 12, scale: 1 },
      { at: stageMoveStart + 10.1, duration: 0.01 },
    ],
    ['.ats-demo-send-link', { scale: 1 }, { at: stageMoveStart + 10.1, duration: 0.01 }],
    [
      '.ats-demo-board-pointer, .ats-demo-sheet-pointer',
      { opacity: 0, x: 12, y: 12, scale: 1 },
      { at: stageMoveStart + 10.1, duration: 0.01 },
    ],
    [
      '.ats-demo-scene',
      { '--ats-demo-reset-opacity': 0 },
      { at: stageMoveStart + 10.2, duration: 0.35, ease: 'easeInOut' },
    ],
  ];
}

export function AtsProductVisual() {
  const { scope, reduceMotion } = useProductDemoPlayback(createSequence, { repeatDelay: 0.8 });

  return (
    <div
      ref={scope}
      className="ats-demo @container/ats-demo grid size-full place-items-center pt-5 px-7 pb-3 max-[400px]:px-4.5 min-[1280px]:max-[1440px]:pt-2.5 min-[1280px]:max-[1440px]:pb-2"
      role="img"
      aria-label="Noah opens Maya Chen’s candidate sheet and selects Submit feedback in Activities. He completes the review, then Grace moves Maya to Portfolio review and sends a booking link for the 45-minute interview."
    >
      <div
        key={reduceMotion ? 'static' : 'animated'}
        className="ats-demo-scene relative w-full max-w-140 h-72 pointer-events-none"
        aria-hidden="true"
      >
        <Card
          className="ats-demo-board absolute gap-0 p-4 border-0 rounded-[22px] bg-card top-2 right-0 bottom-2 left-0 overflow-visible"
          style={
            {
              '--ats-demo-drag-progress': reduceMotion ? 1 : 0,
              transform: reduceMotion ? 'translateX(-20px) scale(0.95)' : 'none',
            } as CSSProperties
          }
        >
          <div className="ats-demo-columns grid grid-cols-3 gap-2.5 @max-[520px]/ats-demo:grid-cols-2">
            <div className="ats-demo-column min-w-0">
              <div className={columnHeadingClassName}>
                <div className="ats-demo-before-move" style={{ opacity: reduceMotion ? 0 : 1 }}>
                  <KanbanColumnHeader name="Recruiter screen" total={2} />
                </div>
                <div className="ats-demo-after-move" style={{ opacity: reduceMotion ? 1 : 0 }}>
                  <KanbanColumnHeader name="Recruiter screen" total={1} />
                </div>
              </div>
              <div className="ats-demo-column-body relative flex h-52 flex-col gap-2 p-1.5 rounded-[14px] bg-muted">
                <div className="ats-demo-source-space h-21 flex-none" />
                <Card
                  className={cn(miniCardClassName, 'ats-demo-sofia')}
                  style={{ transform: reduceMotion ? 'translateY(-92px)' : 'none' }}
                >
                  <KanbanCardBody
                    name="Sofia Lindqvist"
                    company="Harbor Health"
                    status={{ variant: 'warning', label: 'Needs scheduling' }}
                    footer={null}
                  />
                </Card>
              </div>
            </div>
            <div className="ats-demo-column min-w-0">
              <div className={columnHeadingClassName}>
                <div className="ats-demo-before-move" style={{ opacity: reduceMotion ? 0 : 1 }}>
                  <KanbanColumnHeader name="Portfolio review" total={1} />
                </div>
                <div className="ats-demo-after-move" style={{ opacity: reduceMotion ? 1 : 0 }}>
                  <KanbanColumnHeader name="Portfolio review" total={2} />
                </div>
              </div>
              <div className="ats-demo-column-body relative flex h-52 flex-col gap-2 p-1.5 rounded-[14px] bg-muted">
                <div
                  className="ats-demo-drop-target absolute top-1.5 right-1.5 bottom-auto left-1.5 h-21 rounded-[11px]"
                  style={{ opacity: 0 }}
                />
                <Card
                  className={cn(miniCardClassName, 'ats-demo-lucia')}
                  style={{ transform: reduceMotion ? 'translateY(92px)' : 'none' }}
                >
                  <KanbanCardBody
                    name="Lucía Ferreira"
                    company="Kitewell"
                    status={{ variant: 'destructive', label: 'Waiting on feedback' }}
                    footer={null}
                  />
                </Card>
              </div>
            </div>
            <div className="ats-demo-column min-w-0 ats-demo-last-column @max-[520px]/ats-demo:hidden">
              <div className={columnHeadingClassName}>
                <KanbanColumnHeader name="Hiring manager" total={1} />
              </div>
              <div className="ats-demo-column-body relative flex h-52 flex-col gap-2 p-1.5 rounded-[14px] bg-muted">
                <Card className={miniCardClassName}>
                  <KanbanCardBody
                    name="Amara Nwosu"
                    company="Lumen"
                    status={{ variant: 'warning', label: 'In review · 2/3' }}
                    footer={null}
                  />
                </Card>
              </div>
            </div>
          </div>
          <Card
            className={cn(
              miniCardClassName,
              'ats-demo-moving-card absolute top-[54px] z-2 overflow-visible [&>_.ats-demo-mini-status]:absolute [&>_.ats-demo-mini-status]:top-[39px] [&>_.ats-demo-mini-status]:left-2.5 [&>_.ats-demo-mini-status]:right-2 [&>_.ats-demo-mini-status]:mx-0 [&>_.ats-demo-mini-status]:mb-0 [&>_.ats-demo-mini-status]:mt-2 [&>_.ats-demo-before-move]:grid [&_.ats-demo-review-pending]:col-start-1 [&_.ats-demo-review-pending]:row-start-1 [&_.ats-demo-review-complete]:col-start-1 [&_.ats-demo-review-complete]:row-start-1',
            )}
          >
            <KanbanCardBody name="Maya Chen" company="Pillbox" status={null} footer={null} />
            <div className="ats-demo-mini-status ats-demo-before-move" style={{ opacity: reduceMotion ? 0 : 1 }}>
              <span className="ats-demo-review-pending" style={{ opacity: 1 }}>
                <StatusBadge variant="warning" label="In review · 1/2" />
              </span>
              <span className="ats-demo-review-complete" style={{ opacity: 0 }}>
                <StatusBadge variant="destructive" label="Needs decision" />
              </span>
            </div>
            <div className="ats-demo-mini-status ats-demo-after-move" style={{ opacity: 0 }}>
              <span className="ats-demo-before-send" style={{ opacity: 1 }}>
                <StatusBadge variant="warning" label="Needs scheduling" />
              </span>
            </div>
            <div className="ats-demo-mini-status ats-demo-after-send" style={{ opacity: reduceMotion ? 1 : 0 }}>
              <StatusBadge variant="warning" label="Booking link sent" />
            </div>
            <span
              className="ats-demo-card-selection absolute inset-0 rounded-[inherit]"
              style={{ opacity: reduceMotion ? 1 : 0 }}
            />
          </Card>
          <ProductDemoCursor
            className="ats-demo-pointer z-3 ats-demo-review-board-pointer top-18.75"
            name="Noah"
            style={{ opacity: 0, transform: 'translate(12px, 12px)' }}
          />
          <ProductDemoCursor
            className="ats-demo-pointer z-3 ats-demo-board-pointer top-18.75"
            name="Grace"
            style={{ opacity: 0, transform: 'translate(12px, 12px)' }}
          />
        </Card>

        <Card
          className={cn(panelClassName, 'ats-demo-review-sheet h-auto pb-4')}
          style={{ opacity: 0, transform: 'translateX(24px)' }}
        >
          <header className="ats-demo-sheet-header relative pt-3 px-4 pb-2.5">
            <p className="ats-demo-candidate text-[16px] font-medium leading-[20px] tracking-[-0.025em]">Maya Chen</p>
            <p className="ats-demo-headline mt-0.5 text-muted-foreground text-[11px] leading-[14px]">
              Product Designer at Pillbox
            </p>
            <div className="ats-demo-sheet-status absolute top-[13px] right-4 [&_[data-slot=badge]]:h-4.5 [&_[data-slot=badge]]:px-1.5 [&_[data-slot=badge]]:text-[9px]">
              <StatusBadge variant="warning" label="In review · 1/2" />
            </div>
          </header>
          <div className={tabsClassName}>
            <span data-active="true">Activities</span>
            <span>Overview</span>
            <span>Resume</span>
          </div>
          <div className="ats-demo-current-activities pt-2.5 px-4 pb-0">
            <p className="ats-demo-section-title mb-1.5 text-foreground text-[12px] font-medium leading-[16px]">
              Activities
            </p>
            <div className="ats-demo-activity-group overflow-hidden border border-separator rounded-[14px]">
              <div className="ats-demo-review-entry grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 gap-y-0.5 p-3 @max-[360px]/ats-demo:grid-cols-[minmax(0,1fr)_auto] @max-[360px]/ats-demo:gap-[6px_8px]">
                <ClipboardTextIcon className="ats-demo-activity-icon col-start-1 row-start-1 row-end-3 size-3.5 flex-none text-muted-foreground @max-[360px]/ats-demo:hidden" />
                <div className="ats-demo-activity-copy contents min-w-0">
                  <p className="ats-demo-activity-title col-start-2 row-start-1 @max-[360px]/ats-demo:col-start-1 text-[12px] font-medium leading-[18px] tracking-[-0.015em]">
                    Application Review
                  </p>
                  <p className="ats-demo-review-meta col-[2/-1] row-start-2 @max-[360px]/ats-demo:col-span-full text-muted-foreground text-[10px] leading-[14px]">
                    Recruiter screen · 1/2 reviewed
                  </p>
                </div>
                <Button
                  asChild
                  size="xs"
                  className={cn(
                    actionClassName,
                    'ats-demo-open-feedback col-start-3 row-start-1 @max-[360px]/ats-demo:col-start-2 @max-[360px]/ats-demo:row-start-1',
                  )}
                >
                  <div>Submit feedback</div>
                </Button>
              </div>
            </div>
          </div>
          <ProductDemoCursor
            className="ats-demo-pointer z-3 ats-demo-review-sheet-pointer top-[151px]"
            name="Noah"
            style={{ opacity: 0, transform: 'translate(12px, 12px)' }}
          />
        </Card>

        <Card
          className={cn(panelClassName, 'ats-demo-feedback h-72 flex flex-col')}
          style={{ opacity: 0, transform: 'translateX(24px)' }}
        >
          <header className="ats-demo-feedback-header pt-3.5 px-4 pb-2.5">
            <p className="ats-demo-candidate text-[16px] font-medium leading-[20px] tracking-[-0.025em]">
              Application Review
            </p>
            <p className="ats-demo-headline mt-0.5 text-muted-foreground text-[11px] leading-[14px]">
              Maya Chen · Recruiter screen
            </p>
          </header>
          <div className="ats-demo-feedback-body px-4">
            <div className="ats-demo-feedback-reviewer flex items-center gap-1.5 mb-4 text-[11px] leading-[14px] [&_[data-slot=avatar]]:size-6">
              <InitialsAvatar
                identity={{ name: 'Noah Patel' }}
                imageSrc="/images/hero-members/noah-patel.webp"
                size="sm"
              />
              <span>Noah Patel</span>
              <span className="ats-demo-review-count grid ml-auto text-muted-foreground text-[10px] [&>_span]:col-start-1 [&>_span]:row-start-1">
                <span className="ats-demo-review-pending" style={{ opacity: 1 }}>
                  1/2 reviewed
                </span>
                <span className="ats-demo-review-complete" style={{ opacity: 0 }}>
                  2/2 reviewed
                </span>
              </span>
            </div>
            <p className="ats-demo-feedback-label mb-[5px] text-[10px] leading-[14px]">Overall recommendation</p>
            <div className="ats-demo-recommendations grid grid-cols-4 gap-[5px] text-[10px] leading-[14px] [&>_span]:relative [&>_span]:grid [&>_span]:h-6.5 [&>_span]:place-items-center [&>_span]:border [&>_span]:border-control-border [&>_span]:rounded-[7px] [&>_span]:text-muted-foreground [&>_span]:whitespace-nowrap @max-[360px]/ats-demo:text-[9px]">
              <span>Strong Yes</span>
              <span className="ats-demo-recommendation-yes">
                Yes
                <span
                  className="ats-demo-recommendation-selected absolute inset-[-1px] grid place-items-center rounded-[inherit] text-primary"
                  style={{ opacity: 0 }}
                >
                  Yes
                </span>
              </span>
              <span>No</span>
              <span>Strong No</span>
            </div>
            <p className="ats-demo-feedback-label mb-[5px] text-[10px] leading-[14px] ats-demo-notes-label mt-2.5">
              Notes
            </p>
            <div className="ats-demo-feedback-notes relative h-16 p-[7px] border border-control-border rounded-[7px] text-[10px] leading-[14px] [&>_span]:block [&>_span]:whitespace-nowrap">
              <span
                className="ats-demo-notes-focus absolute inset-[-1px] pointer-events-none rounded-[inherit]"
                style={{ opacity: 0 }}
              />
              <span className="ats-demo-notes-first-line" style={{ clipPath: 'inset(0 100% 0 0)' }}>
                Clear examples from care teams.
              </span>
              <span className="ats-demo-notes-second-line" style={{ clipPath: 'inset(0 100% 0 0)' }}>
                Ready for a portfolio conversation.
              </span>
            </div>
          </div>
          <footer className="ats-demo-feedback-footer flex justify-end mt-auto pt-2 px-4 pb-4">
            <Button asChild size="xs" className={cn(actionClassName, 'ats-demo-submit-feedback')}>
              <div>Submit feedback</div>
            </Button>
          </footer>
          <ProductDemoCursor
            className="ats-demo-pointer z-3 ats-demo-feedback-pointer top-[133px] @max-[360px]/ats-demo:[&_.product-demo-cursor-name]:top-3.5 @max-[360px]/ats-demo:[&_.product-demo-cursor-name]:right-1.5 @max-[360px]/ats-demo:[&_.product-demo-cursor-name]:left-auto"
            name="Noah"
            style={{ opacity: 0, transform: 'translate(12px, 12px)' }}
          />
        </Card>

        <Card
          className={cn(panelClassName, 'ats-demo-sheet h-auto pb-4')}
          style={{
            opacity: reduceMotion ? 1 : 0,
            transform: reduceMotion ? 'none' : 'translateX(24px)',
          }}
        >
          <header className="ats-demo-sheet-header relative pt-3 px-4 pb-2.5">
            <p className="ats-demo-candidate text-[16px] font-medium leading-[20px] tracking-[-0.025em]">Maya Chen</p>
            <p className="ats-demo-headline mt-0.5 text-muted-foreground text-[11px] leading-[14px]">
              Product Designer at Pillbox
            </p>
            <div
              className="ats-demo-sheet-status absolute top-[13px] right-4 [&_[data-slot=badge]]:h-4.5 [&_[data-slot=badge]]:px-1.5 [&_[data-slot=badge]]:text-[9px] ats-demo-before-send"
              style={{ opacity: reduceMotion ? 0 : 1 }}
            >
              <StatusBadge variant="warning" label="Needs scheduling" />
            </div>
            <div
              className="ats-demo-sheet-status absolute top-[13px] right-4 [&_[data-slot=badge]]:h-4.5 [&_[data-slot=badge]]:px-1.5 [&_[data-slot=badge]]:text-[9px] ats-demo-after-send"
              style={{ opacity: reduceMotion ? 1 : 0 }}
            >
              <StatusBadge variant="warning" label="Booking link sent" />
            </div>
          </header>
          <div className={tabsClassName}>
            <span data-active="true">Activities</span>
            <span>Overview</span>
            <span>Resume</span>
          </div>
          <div className="ats-demo-current-activities pt-2.5 px-4 pb-0">
            <p className="ats-demo-section-title mb-1.5 text-foreground text-[12px] font-medium leading-[16px]">
              Activities
            </p>
            <div className="ats-demo-activity-group overflow-hidden border border-separator rounded-[14px]">
              <div className="ats-demo-interview-activity grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-2 p-3 @max-[360px]/ats-demo:grid-cols-[minmax(0,1fr)_auto] @max-[360px]/ats-demo:gap-[6px_8px]">
                <CalendarPlusIcon className="ats-demo-activity-icon size-3.5 flex-none text-muted-foreground @max-[360px]/ats-demo:hidden" />
                <div className="ats-demo-activity-copy min-w-0 @max-[360px]/ats-demo:contents">
                  <p className="ats-demo-activity-title @max-[360px]/ats-demo:col-start-1 @max-[360px]/ats-demo:row-start-1 text-[12px] font-medium leading-[18px] tracking-[-0.015em]">
                    Portfolio review
                  </p>
                  <div className="ats-demo-interview-meta flex flex-wrap items-center gap-[3px_10px] mt-0.5 text-muted-foreground text-[10px] leading-[14px] [&>_span]:inline-flex [&>_span]:items-center [&>_span]:gap-1 [&>_span]:whitespace-nowrap @max-[360px]/ats-demo:col-span-full @max-[360px]/ats-demo:row-start-2">
                    <span>45 min interview</span>
                  </div>
                </div>
                <div className="ats-demo-booking-action grid h-6.5 place-items-center @max-[360px]/ats-demo:col-start-2 @max-[360px]/ats-demo:row-start-1">
                  <div
                    className="ats-demo-activity-actions flex col-start-1 row-start-1"
                    style={{ opacity: reduceMotion ? 0 : 1 }}
                  >
                    <Button asChild size="xs" className={cn(actionClassName, 'ats-demo-send-link')}>
                      <div>Send booking link</div>
                    </Button>
                  </div>
                  <span
                    className="ats-demo-booking-provider inline-flex col-start-1 row-start-1 items-center gap-[5px] text-muted-foreground text-[10px] leading-[14px] whitespace-nowrap"
                    style={{ opacity: reduceMotion ? 1 : 0 }}
                  >
                    <img src="/images/google-meet.webp" alt="" width="12" height="12" className="size-3 flex-none" />
                    Google Meet
                  </span>
                </div>
              </div>
              <div className="ats-demo-review-activity flex items-center gap-2 py-2.5 px-3 border-t-[1px] border-t-separator">
                <ChatCenteredTextIcon className="ats-demo-activity-icon size-3.5 flex-none text-muted-foreground" />
                <div className="ats-demo-activity-copy min-w-0">
                  <p className="ats-demo-activity-title text-[12px] font-medium leading-[18px] tracking-[-0.015em]">
                    Interview feedback
                  </p>
                  <p className="ats-demo-review-meta text-muted-foreground text-[10px] leading-[14px]">
                    After the interview
                  </p>
                </div>
              </div>
            </div>
          </div>
          <ProductDemoCursor
            className="ats-demo-pointer z-3 ats-demo-sheet-pointer top-[151px]"
            name="Grace"
            style={{ opacity: 0, transform: 'translate(12px, 12px)' }}
          />
        </Card>
      </div>
    </div>
  );
}
