import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { cn } from '@comitium/ui/cn';
import { CaretLeftIcon, LockSimpleIcon, UserIcon } from '@phosphor-icons/react';
import type { AnimationSequence } from 'motion/react';
import { ProductDemoCursor } from './product-demo-cursor';
import { useProductDemoPlayback } from './use-product-demo-playback';

const proofSignalLength = 0.36;

const ciphertextClassName =
  'overflow-hidden font-mono text-[10px] font-medium leading-[15px] text-ellipsis whitespace-nowrap text-[#66717b] @max-[360px]/identity-demo:text-[9.5px]';

function VerificationIndicator({ className, verified }: { className: string; verified: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('identity-demo-status-indicator absolute size-[18px] flex-none', className)}
      data-verified={verified}
    >
      <circle className="identity-demo-status-ring" cx="12" cy="12" r="9.2" pathLength="1" />
      <path className="identity-demo-status-check" d="m7.8 12 2.8 2.8 5.6-5.6" pathLength="1" />
    </svg>
  );
}

function createSequence(): AnimationSequence {
  const transferAt = 3;
  const travelDuration = 0.9;
  const verificationDuration = 1.1;
  // Move the trailing rounded cap beyond the path endpoint before verifying.
  const transferDuration = travelDuration * (proofSignalLength + 1.03);

  return [
    ['.identity-demo-scan', { opacity: 1 }, { at: 0.18, duration: 0.12 }],
    ['.identity-demo-scan', { '--identity-scan-progress': 1 }, { at: 0.3, duration: 0.75, ease: 'linear' }],
    ['.identity-demo-scan', { opacity: 0 }, { at: 1.05, duration: 0.1 }],
    ['.identity-demo-cursor', { opacity: 1 }, { at: 1.2, duration: 0.18 }],
    ['.identity-demo-cursor', { '--identity-pointer-progress': 1 }, { at: 1.38, duration: 0.27 }],
    ['.identity-demo-cursor', { scale: 0.86 }, { at: 1.7, duration: 0.12 }],
    ['.identity-demo-proof-action', { scale: 0.97 }, { at: 1.7, duration: 0.12 }],
    ['.identity-demo-cursor', { scale: 1 }, { at: 1.83, duration: 0.14 }],
    ['.identity-demo-proof-action', { scale: 1 }, { at: 1.83, duration: 0.15 }],
    ['.identity-demo-cursor', { opacity: 0 }, { at: 1.92, duration: 0.16 }],
    ['.identity-demo-action-labels-track', { y: -18 }, { at: 1.82, duration: 0.24 }],
    ['.identity-demo-phone-indicator', { opacity: 1 }, { at: 1.96, duration: 0.16 }],
    [
      '.identity-demo-phone-indicator',
      { '--identity-ring-rotation': '1440deg' },
      { at: 1.96, duration: transferAt + transferDuration + verificationDuration - 1.96, ease: 'linear' },
    ],
    ['.identity-demo-action-labels-track', { y: -36 }, { at: 2.7, duration: 0.24 }],
    ['.identity-demo-connection-signal', { opacity: 1 }, { at: transferAt, duration: 0.1 }],
    [
      '.identity-demo-connection-signal',
      { strokeDashoffset: [proofSignalLength, -1.03] },
      { at: transferAt, duration: transferDuration, ease: 'linear' },
    ],
    'proof-received',
    ['.identity-demo-connection-signal', { opacity: 0 }, { at: 'proof-received', duration: 0.01 }],
    ['.identity-demo-account-avatar', { '--identity-receipt-emphasis': 1 }, { at: 'proof-received', duration: 0.18 }],
    ['.identity-demo-account-avatar', { '--identity-receipt-emphasis': 0 }, { at: '+0.15', duration: 0.35 }],
    ['.identity-demo-status-track', { y: -22 }, { at: 'proof-received', duration: 0.28 }],
    ['.identity-demo-action-labels-track', { y: -54 }, { at: 'proof-received', duration: 0.28 }],
    [
      '.identity-demo-result-indicator',
      { opacity: 1, '--identity-ring-length': 0.74 },
      { at: 'proof-received', duration: 0.14 },
    ],
    [
      '.identity-demo-result-indicator',
      { '--identity-ring-rotation': '480deg' },
      { at: 'proof-received', duration: verificationDuration, ease: 'linear' },
    ],
    'verification-complete',
    [
      '.identity-demo-phone-indicator, .identity-demo-result-indicator',
      { '--identity-ring-length': 1 },
      { at: 'verification-complete', duration: 0.22 },
    ],
    [
      '.identity-demo-proof-action',
      { '--identity-action-success': '100%' },
      { at: 'verification-complete', duration: 0.28 },
    ],
    [
      '.identity-demo-result-indicator',
      { '--identity-status-success': '100%' },
      { at: 'verification-complete', duration: 0.28 },
    ],
    ['.identity-demo-action-labels-track', { y: -72 }, { at: 'verification-complete', duration: 0.28 }],
    ['.identity-demo-status-track', { y: -44 }, { at: 'verification-complete', duration: 0.28 }],
    [
      '.identity-demo-phone-indicator, .identity-demo-result-indicator',
      { '--identity-check-progress': 1 },
      { at: 'verification-complete', duration: 0.28 },
    ],
    ['.identity-demo-scene', { '--identity-demo-reset-opacity': 1 }, { at: '+1.8', duration: 0.28 }],
    'reset-covered',
    ['.identity-demo-scan', { opacity: 0, '--identity-scan-progress': 0 }, { at: 'reset-covered', duration: 0.01 }],
    [
      '.identity-demo-proof-action',
      { scale: 1, '--identity-action-success': '0%' },
      { at: 'reset-covered', duration: 0.01 },
    ],
    [
      '.identity-demo-action-labels-track, .identity-demo-status-track',
      { y: 0 },
      { at: 'reset-covered', duration: 0.01 },
    ],
    [
      '.identity-demo-status-indicator',
      { '--identity-ring-rotation': '0deg', '--identity-check-progress': 0 },
      { at: 'reset-covered', duration: 0.01 },
    ],
    [
      '.identity-demo-phone-indicator',
      { opacity: 0, '--identity-ring-length': 0.74 },
      { at: 'reset-covered', duration: 0.01 },
    ],
    [
      '.identity-demo-result-indicator',
      { opacity: 0, '--identity-ring-length': 1, '--identity-status-success': '0%' },
      { at: 'reset-covered', duration: 0.01 },
    ],
    [
      '.identity-demo-cursor',
      { opacity: 0, scale: 1, '--identity-pointer-progress': 0 },
      { at: 'reset-covered', duration: 0.01 },
    ],
    [
      '.identity-demo-connection-signal',
      { opacity: 0, strokeDashoffset: proofSignalLength },
      { at: 'reset-covered', duration: 0.01 },
    ],
    ['.identity-demo-scene', { '--identity-demo-reset-opacity': 0 }, { at: '+0.08', duration: 0.28 }],
  ];
}

export function IdentityProductVisual() {
  const { scope, isInView, reduceMotion } = useProductDemoPlayback(createSequence, { speed: 0.75 });

  return (
    <div
      ref={scope}
      className="identity-demo  @container/identity-demo flex size-full items-center justify-center py-0.5 px-4 pointer-events-none max-[400px]:px-2.5 max-[360px]:px-1.5"
      data-in-view={isInView}
      role="img"
      aria-label="An ID is checked on the candidate’s phone. The ID details remain on that device. The candidate creates a Zero Knowledge proof and sends only that proof to Comitium, which verifies it and confirms identity."
    >
      <div
        key={reduceMotion ? 'static' : 'animated'}
        className="identity-demo-scene relative w-full max-w-[430px] h-73 flex-none text-foreground"
        aria-hidden="true"
      >
        <div className="identity-demo-phone absolute top-0 left-0 z-2 h-73 p-1 border border-[#d2dae6] rounded-[25px]">
          <div className="identity-demo-screen relative h-full pt-6 px-[11px] pb-4.5 overflow-hidden border border-surface-border rounded-[20px] bg-card @max-[360px]/identity-demo:px-2">
            <div className="identity-demo-speaker absolute top-2 left-[50%] w-8 h-1 rounded-[5px] bg-[#b7c2d2]" />
            <div className="identity-demo-phone-header flex items-center gap-[5px]">
              <CaretLeftIcon className="size-3 flex-none text-muted-foreground" />
              <p className="identity-demo-phone-title text-[16px] font-medium leading-[22px] tracking-[-0.025em] whitespace-nowrap @max-[360px]/identity-demo:text-[14px]">
                Identity check
              </p>
            </div>
            <div className="identity-demo-id relative h-26 mt-2.5 p-2 overflow-hidden border border-[#e2e5e8] rounded-[10px] @max-[360px]/identity-demo:px-1.5">
              <div className="identity-demo-id-heading flex items-center justify-between gap-1">
                <p className="text-[12px] font-medium leading-[16px] whitespace-nowrap @max-[360px]/identity-demo:text-[11px] @max-[300px]/identity-demo:text-[10.5px]">
                  Government ID
                </p>
                <svg
                  viewBox="0 0 24 14"
                  fill="currentColor"
                  className="identity-demo-chip w-4.5 h-[10.5px] flex-none text-[#68727c] @max-[360px]/identity-demo:w-3.5"
                >
                  <path d="M0 0h24v6h-7.101a5 5 0 0 0-9.798 0H0Zm0 8h7.101a5 5 0 0 0 9.798 0H24v6H0Z" />
                  <circle cx="12" cy="7" r="3" />
                </svg>
              </div>
              <div className="identity-demo-id-details flex items-center gap-2 mt-2 @max-[360px]/identity-demo:gap-[5px]">
                <div className="identity-demo-id-avatar relative grid h-14 w-12 flex-none place-items-center rounded-[5px] bg-[#e5e9ec] text-[#89959f] @max-[360px]/identity-demo:h-10 @max-[360px]/identity-demo:w-8">
                  <UserIcon weight="fill" className="size-8 @max-[360px]/identity-demo:size-6" />
                  <span className="identity-demo-id-lock absolute right-[-4px] bottom-[-3px] grid size-4.5 place-items-center border-2 border-[#f5f6f7] rounded-full bg-[#dce2e6] text-[#56636e]">
                    <LockSimpleIcon weight="bold" className="size-2.5" />
                  </span>
                </div>
                <div className="identity-demo-id-data @container/identity-cipher min-w-0 flex-1">
                  <span className="block text-[10px] leading-[14px] text-muted-foreground">Encrypted</span>
                  <p className={ciphertextClassName}>
                    Q7m4L9x2R
                    <span className="identity-demo-cipher-tail @max-[66px]/identity-cipher:hidden">
                      8v<span className="identity-demo-cipher-end @max-[79px]/identity-cipher:hidden">S2</span>
                    </span>
                  </p>
                  <p className={ciphertextClassName}>
                    B2k8N6p3V
                    <span className="identity-demo-cipher-tail @max-[66px]/identity-cipher:hidden">
                      5r<span className="identity-demo-cipher-end @max-[79px]/identity-cipher:hidden">T9</span>
                    </span>
                  </p>
                  <p className={ciphertextClassName}>
                    H9c3T7s5D
                    <span className="identity-demo-cipher-tail @max-[66px]/identity-cipher:hidden">
                      4n<span className="identity-demo-cipher-end @max-[79px]/identity-cipher:hidden">P6</span>
                    </span>
                  </p>
                </div>
              </div>
              <div className="identity-demo-scan absolute right-0 left-0 h-5" style={{ opacity: 0 }} />
            </div>
            <div className="identity-demo-phone-status absolute right-[11px] bottom-6.5 left-[11px] h-9.5 text-[12px] leading-[18px] @max-[360px]/identity-demo:right-2 @max-[360px]/identity-demo:left-2 @max-[360px]/identity-demo:text-[11px]">
              <Button
                asChild
                className="identity-demo-proof-action relative h-9.5 w-full rounded-[8px] p-0 text-[length:inherit] leading-[calc(20/14)] transition-none"
                data-verified={reduceMotion}
              >
                <div>
                  <div className="identity-demo-action-labels absolute inset-0 grid place-items-center px-1">
                    <div className="identity-demo-action-labels-window w-full h-4.5 overflow-hidden">
                      <div
                        className="identity-demo-action-labels-track [&>_span]:block [&>_span]:h-4.5 [&>_span]:text-[length:inherit] [&>_span]:leading-[18px] [&>_span]:text-center [&>_span]:whitespace-nowrap"
                        style={{ transform: reduceMotion ? 'translateY(-72px)' : 'none' }}
                      >
                        <span>Create ZK proof</span>
                        <span className="identity-demo-generating">Creating proof</span>
                        <span className="identity-demo-sending">Sending proof</span>
                        <span className="identity-demo-action-verifying">Verifying</span>
                        <span>Verified</span>
                      </div>
                    </div>
                  </div>
                  <VerificationIndicator
                    className="identity-demo-phone-indicator top-1/2 left-2 size-4.5 @max-[360px]/identity-demo:left-1 @max-[360px]/identity-demo:size-3.5"
                    verified={reduceMotion}
                  />
                </div>
              </Button>
            </div>
            <div className="identity-demo-home-indicator absolute right-[34%] bottom-1.5 left-[34%] h-[3px] rounded-[3px] bg-[#c8d0db]" />
          </div>
        </div>

        <svg
          className="identity-demo-connection absolute top-[50%] h-[95px] overflow-visible"
          viewBox="0 0 100 100"
          fill="none"
          preserveAspectRatio="none"
        >
          <path d="M0 100C48 100 52 0 100 0" />
          <path
            className="identity-demo-connection-signal"
            d="M0 100C48 100 52 0 100 0"
            pathLength="1"
            strokeDasharray={`${proofSignalLength} 2`}
            strokeLinecap="round"
            style={{ opacity: 0, strokeDashoffset: proofSignalLength }}
          />
        </svg>

        <Card className="identity-demo-profile absolute top-[50%] right-0 z-2 h-33 items-center justify-center gap-0 p-3 border-0 rounded-[18px]">
          <div className="identity-demo-account-avatar relative grid size-13 flex-none place-items-center border border-surface-border rounded-full bg-muted text-[#89959f]">
            <UserIcon weight="fill" className="identity-demo-account-avatar-icon size-7.5" />
            <VerificationIndicator
              className="identity-demo-result-indicator right-[-3px] bottom-[-3px] size-6 border-[3px] border-card rounded-full bg-card"
              verified={reduceMotion}
            />
          </div>
          <div className="identity-demo-identity-title relative w-full h-[22px] overflow-hidden flex-none mt-3 text-[18px] font-medium leading-[22px] tracking-[-0.025em] text-center whitespace-nowrap @max-[360px]/identity-demo:text-[16px]">
            <div
              className="identity-demo-status-track [&>_p]:h-[22px] [&>_p]:whitespace-nowrap"
              style={{ transform: reduceMotion ? 'translateY(-44px)' : 'none' }}
            >
              <p className="identity-demo-pending">Verification</p>
              <p className="identity-demo-verifying">Verifying</p>
              <p className="identity-demo-verified">Verified</p>
            </div>
          </div>
          <p className="identity-demo-proof-only mt-1 text-muted-foreground text-[10px] leading-[14px] whitespace-nowrap @max-[360px]/identity-demo:text-[9px]">
            Private by default
          </p>
        </Card>

        <ProductDemoCursor className="identity-demo-cursor z-4" style={{ opacity: 0 }} />
      </div>
    </div>
  );
}
