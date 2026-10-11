import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { cn } from '@comitium/ui/cn';
import { StatusBadge } from '@comitium/ui/status-badge';
import { Clock, Globe } from 'lucide-react';
import type { AnimationSequence } from 'motion/react';
import { LANDING_SECONDARY_ICON_CLASS_NAME } from './landing-layout';
import { ProductDemoCursor } from './product-demo-cursor';
import { DEMO_RESET_TIMING, useProductDemoPlayback } from './use-product-demo-playback';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAYS = Array.from({ length: 35 }, (_, index) => {
  const day = index - 2;
  return day > 0 && day <= 31 ? day : null;
});
const TIMES = ['10:30', '11:30', '14:00'];

function createSequence(): AnimationSequence {
  const resetAt = 7.3;
  const resetSwapAt = resetAt + DEMO_RESET_TIMING.fadeOut;
  const resetInAt = resetSwapAt + DEMO_RESET_TIMING.swap;
  return [
    ['.scheduling-demo-pointer', { opacity: 1, x: 0, y: 0 }, { at: 0.35, duration: 0.35 }],
    ['.scheduling-demo-pointer', { scale: 0.86 }, { at: 0.8, duration: 0.12 }],
    ['.scheduling-demo-slot-selected', { opacity: 1 }, { at: 0.8, duration: 0.2 }],
    ['.scheduling-demo-pointer', { scale: 1 }, { at: 0.95, duration: 0.18 }],
    ['.scheduling-demo-confirm-button', { opacity: 1, y: 0 }, { at: 0.8, duration: 0.2 }],
    ['.scheduling-demo-pointer', { y: 145 }, { at: 1.5, duration: 0.55 }],
    ['.scheduling-demo-pointer', { scale: 0.86 }, { at: 2.15, duration: 0.12 }],
    ['.scheduling-demo-confirm-button', { scale: 0.97 }, { at: 2.15, duration: 0.12 }],
    ['.scheduling-demo-confirm-button', { opacity: 0 }, { at: 2.3, duration: 0.2 }],
    ['.scheduling-demo-pointer', { opacity: 0, scale: 1 }, { at: 2.4, duration: 0.15 }],
    ['.scheduling-demo-availability', { opacity: 0, y: -8 }, { at: 2.55, duration: 0.25 }],
    ['.scheduling-demo-confirmation', { opacity: 1, x: 0 }, { at: 2.75, duration: 0.35 }],
    ['.scheduling-demo-event', { opacity: 1, y: 0, scale: 1 }, { at: 3.05, duration: 0.45 }],
    ['.scheduling-demo-scheduled', { opacity: 1 }, { at: 3.05, duration: 0.45 }],
    ['.scheduling-demo-confirmation', { opacity: 0 }, { at: resetAt, duration: DEMO_RESET_TIMING.fadeOut }],
    ['.scheduling-demo-event', { opacity: 0, y: 8, scale: 0.97 }, { at: resetSwapAt, duration: 0.01 }],
    ['.scheduling-demo-scheduled', { opacity: 0 }, { at: resetSwapAt, duration: 0.01 }],
    ['.scheduling-demo-slot-selected', { opacity: 0 }, { at: resetSwapAt, duration: 0.01 }],
    ['.scheduling-demo-confirm-button', { y: 4, scale: 1 }, { at: resetSwapAt, duration: 0.01 }],
    ['.scheduling-demo-pointer', { opacity: 0, x: 12, y: 18, scale: 1 }, { at: resetSwapAt, duration: 0.01 }],
    ['.scheduling-demo-availability', { y: 0 }, { at: resetSwapAt, duration: 0.01 }],
    ['.scheduling-demo-availability', { opacity: 1 }, { at: resetInAt, duration: DEMO_RESET_TIMING.fadeIn }],
  ];
}

export function SchedulingProductVisual() {
  const { scope, reduceMotion } = useProductDemoPlayback(createSequence, { repeatDelay: 0.2 });

  return (
    <div
      ref={scope}
      className="scheduling-demo @container/scheduling-demo grid grid-rows-[minmax(0,_1fr)] size-full place-items-center pt-3 px-6 pb-2 max-[400px]:px-4.5 min-[1280px]:max-[1440px]:pt-2.5 min-[1280px]:max-[1440px]:pb-2"
      role="img"
      aria-label="Maya Chen chooses Friday, October 9 at 10:30. Her 45-minute portfolio review with Noah Patel appears on the calendar with a Google Meet link."
    >
      <Card
        key={reduceMotion ? 'static' : 'animated'}
        className="scheduling-demo-frame relative w-full max-w-112 h-75 gap-0 p-0 border-0 rounded-[22px] overflow-hidden text-[12px] leading-[calc(20/14)]"
        aria-hidden="true"
      >
        <div
          className="scheduling-demo-availability absolute inset-0 p-5 pointer-events-none @max-[350px]/scheduling-demo:p-4"
          style={{ opacity: reduceMotion ? 0 : 1 }}
        >
          <header className="scheduling-demo-header">
            <p className="scheduling-demo-title text-[16px] font-medium leading-[22px] tracking-[-0.025em] @max-[350px]/scheduling-demo:text-[15px]">
              Portfolio review
            </p>
            <div className="scheduling-demo-meta flex gap-3.5 mt-[5px] text-[color:var(--landing-text-context)] text-[11px] [&>_span]:inline-flex [&>_span]:items-center [&>_span]:gap-1.5">
              <span>
                <Clock className={cn('size-3.5 flex-none', LANDING_SECONDARY_ICON_CLASS_NAME)} />
                45 min
              </span>
              <span>
                <img
                  src="/images/google-meet.webp"
                  alt=""
                  width="14"
                  height="14"
                  className="scheduling-demo-meet-logo size-3.5 flex-none"
                />
                Google Meet
              </span>
            </div>
          </header>

          <div className="scheduling-demo-picker grid grid-cols-[minmax(0,_1.5fr)_minmax(0,_1fr)] gap-[22px] mt-4 @max-[350px]/scheduling-demo:gap-3">
            <div className="scheduling-demo-calendar">
              <p className="scheduling-demo-month mb-2 text-[12px] font-medium leading-[16px]">October 2026</p>
              <div className="scheduling-demo-weekdays grid grid-cols-7 gap-[3px] text-center text-[11px] tabular-nums mb-1 text-[color:var(--landing-text-meta)]">
                {WEEKDAYS.map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>
              <div className="scheduling-demo-days grid grid-cols-7 gap-[3px] text-center text-[11px] tabular-nums">
                {DAYS.map((day, index) => (
                  <span
                    key={day ?? `empty-${index}`}
                    className="scheduling-demo-day grid h-5 place-items-center rounded-[6px] data-[available=true]:bg-muted data-[available=true]:text-foreground data-[selected=true]:text-primary"
                    data-available={day !== null && day >= 8 && day <= 16 && day !== 10 && day !== 11}
                    data-selected={day === 9}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
            <div className="scheduling-demo-slots flex min-w-0 flex-col items-stretch gap-2 [&_.scheduling-demo-month]:mb-0.5">
              <p className="scheduling-demo-month mb-2 text-[12px] font-medium leading-[16px]">Fri, Oct 9</p>
              {TIMES.map((time, index) => (
                <Button
                  key={time}
                  asChild
                  variant="outline"
                  className="scheduling-demo-slot relative h-8 w-full rounded-[9px] bg-card text-foreground text-[12px] tabular-nums leading-[calc(20/14)] transition-none"
                >
                  <div>
                    {time}
                    {index === 0 && (
                      <span
                        className="scheduling-demo-slot-selected absolute inset-[-1px] grid place-items-center rounded-[inherit] text-primary"
                        style={{ opacity: 0 }}
                      >
                        {time}
                      </span>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <footer className="scheduling-demo-picker-footer absolute right-5 bottom-4 left-5 flex min-h-7.5 items-center justify-end gap-2 @max-[350px]/scheduling-demo:right-4 @max-[350px]/scheduling-demo:left-4">
            <Button
              asChild
              size="sm"
              className="scheduling-demo-confirm-button h-7.5 px-3 text-[11px] leading-[calc(20/14)] transition-none @max-[350px]/scheduling-demo:px-2.5 @max-[350px]/scheduling-demo:text-[10px]"
              style={{ opacity: 0, transform: 'translateY(4px)' }}
            >
              <div>Confirm booking</div>
            </Button>
          </footer>
          <ProductDemoCursor
            className="scheduling-demo-pointer [&>.product-demo-cursor-shape]:flex-none top-[113px] z-2 @max-[350px]/scheduling-demo:top-[109px]"
            name="Maya"
            style={{ opacity: 0, transform: 'translate(12px, 18px)' }}
          />
        </div>

        <div
          className="scheduling-demo-confirmation absolute inset-0 p-5 pointer-events-none @max-[350px]/scheduling-demo:p-4"
          style={{ opacity: reduceMotion ? 1 : 0, transform: reduceMotion ? 'none' : 'translateX(8px)' }}
        >
          <header className="scheduling-demo-booked-header flex items-start justify-between gap-2 [&_[data-slot=badge]]:text-[10px]">
            <p className="scheduling-demo-date text-[14px] font-medium leading-[20px] tracking-[-0.02em]">
              October 2026
            </p>
            <div className="scheduling-demo-scheduled" style={{ opacity: reduceMotion ? 1 : 0 }}>
              <StatusBadge variant="success" label="Scheduled" />
            </div>
          </header>
          <div className="scheduling-demo-week-strip mt-3 ml-10 grid grid-cols-5 text-center text-[10px] leading-[14px] text-[color:var(--landing-text-meta)]">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, index) => (
              <div
                key={day}
                className="group/day flex flex-col items-center gap-[3px] data-[selected=true]:text-primary"
                data-selected={day === 'Fri'}
              >
                <span>{day}</span>
                <span className="scheduling-demo-week-number grid size-6 place-items-center rounded-full text-[12px] font-medium text-foreground group-data-[selected=true]/day:bg-primary group-data-[selected=true]/day:text-primary-foreground">
                  {index + 5}
                </span>
              </div>
            ))}
          </div>
          <div className="scheduling-demo-agenda relative h-52 mt-3">
            {['10:00', '11:00', '12:00'].map((time, index) => (
              <div
                key={time}
                className="scheduling-demo-hour absolute left-0 grid w-full grid-cols-[30px_minmax(0,_1fr)] items-center gap-2.5 text-[color:var(--landing-text-meta)] text-[10px] leading-[14px] tabular-nums"
                style={{ top: index * 100 }}
              >
                <span>{time}</span>
                <span className="scheduling-demo-hour-line h-[1px] bg-separator" />
              </div>
            ))}
            <div
              className="scheduling-demo-event absolute top-[57px] right-0 left-10 h-18.75 py-2 px-2.5 border-l-[2px] border-l-primary rounded-[8px] @max-[350px]/scheduling-demo:px-2"
              style={{
                opacity: reduceMotion ? 1 : 0,
                transform: reduceMotion ? 'none' : 'translateY(8px) scale(0.97)',
              }}
            >
              <p className="scheduling-demo-event-title text-[14px] font-medium leading-[18px] tracking-[-0.02em]">
                Portfolio review
              </p>
              <p className="scheduling-demo-event-time mt-[1px] text-[color:var(--landing-text-content)] text-[11px] leading-[14px] tabular-nums">
                10:30 – 11:15
              </p>
              <div className="scheduling-demo-people flex items-center justify-between gap-2 mt-1.5 text-[10px] leading-[18px] @max-[350px]/scheduling-demo:gap-[5px] @max-[350px]/scheduling-demo:text-[9px]">
                <div className="scheduling-demo-interviewer flex items-center gap-[5px] [&_img]:size-4.5 [&_img]:rounded-full [&_img]:object-cover">
                  <img src="/images/hero-members/noah-patel.webp" alt="" width="18" height="18" loading="lazy" />
                  <span>Noah Patel</span>
                </div>
                <span className="scheduling-demo-meeting inline-flex items-center gap-1.5 text-[color:var(--landing-text-context)] text-[10px] whitespace-nowrap [&_.scheduling-demo-meet-logo]:size-3 @max-[350px]/scheduling-demo:gap-1 @max-[350px]/scheduling-demo:text-[9px]">
                  <img
                    src="/images/google-meet.webp"
                    alt=""
                    width="14"
                    height="14"
                    className="scheduling-demo-meet-logo size-3.5 flex-none"
                  />
                  Google Meet
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="scheduling-demo-timezone absolute bottom-4 left-5 inline-flex h-7.5 items-center gap-1.5 text-[color:var(--landing-text-meta)] text-[11px] pointer-events-none @max-[350px]/scheduling-demo:left-4 @max-[350px]/scheduling-demo:text-[10px]">
          <Globe className={cn('size-3.5 flex-none', LANDING_SECONDARY_ICON_CLASS_NAME)} />
          Europe/London
        </div>
      </Card>
    </div>
  );
}
