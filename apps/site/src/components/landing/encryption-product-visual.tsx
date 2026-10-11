import type { AnimationSequence } from 'motion/react';
import { type CSSProperties, useEffect } from 'react';
import { EncryptionBoundaryScene } from './encryption-boundary-scene';
import { useProductDemoPlayback } from './use-product-demo-playback';

const playbackSpeed = 0.96;

function createSequence(): AnimationSequence {
  const sequence: AnimationSequence = [];
  const passes = [
    { from: 5, to: 100, at: 0, duration: 4.75 },
    // Reset only while both ends are fully clipped.
    { from: 100, to: -40, at: 4.75, duration: 0 },
    { from: -40, to: 100, at: 4.75, duration: 7 },
    { from: 100, to: -40, at: 11.75, duration: 0 },
    { from: -40, to: 5, at: 11.75, duration: 2.25 },
  ];
  for (const { from, to, at, duration } of passes) {
    const timing = { at, duration, ease: 'linear' as const };
    // The boundary reads a non-inherited clock. The sheets move via transform
    // without invalidating the styles and layout of every ciphertext cell.
    sequence.push(['.encryption-demo-scene', { '--packet-x': [from, to] }, timing]);
    // Each packet is 40% of the scene width; x percentages refer to its own width.
    sequence.push(['.encryption-demo-packet', { x: [`${from * 2.5}%`, `${to * 2.5}%`] }, timing]);
  }
  sequence.push(
    ['.encryption-demo-scene', { '--document-format': [0, 1] }, { at: 4.75, duration: 0 }],
    ['.encryption-demo-scene', { '--document-format': [1, 0] }, { at: 11.75, duration: 0 }],
    ['.encryption-demo-scene', { '--cipher-time': [0, 14] }, { at: 0, duration: 14, ease: 'linear' }],
  );
  return sequence;
}

const DOCUMENT_FORMATS = ['portrait', 'landscape'] as const;
const CIPHER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+=/#';
const CIPHERTEXT = [
  'Q7m4L9x2R8vS2k6N5c3H7',
  'B2k8N6p3V5rT9c4L7s2M8',
  'H9c3T7s5D4nP6w8R2v5K9',
  'F4v8M2q6J9xL3b7K6n4S2',
  'W6t2C8r4N7pS5m9D3q8L5',
  'A3n7K5x9V2sQ8c4T6r2B9',
  'R8p4D6m2H9wL5v7B3s8N4',
  'N5s9Q3t7C2kF8r4X6p2W8',
  'J2w6B8n4P7vM3d9S5t7Q3',
  'T7c3L9r5K4xN8q2V6m4F9',
  'P4m8S2v6D9tH3w7R5c2J8',
  'X9k5F3n7B2qC8s4L6v3P7',
];

function AbstractDocument({ landscape }: { landscape: boolean }) {
  if (landscape) {
    return (
      <svg viewBox="0 0 172 146" className="size-full" fill="none">
        <rect x="0.5" y="0.5" width="171" height="145" rx="11" fill="white" stroke="#dde6ef" />
        <rect x="18" y="20" width="58" height="5" rx="2.5" fill="#304b67" />
        <rect x="18" y="32" width="87" height="2.5" rx="1.25" fill="#b4c9e0" />
        <path d="M18 47H154" stroke="#e4ebf2" />
        <g fill="#809bb6">
          <rect x="18" y="61" width="38" height="3" rx="1.5" />
          <rect x="95" y="61" width="43" height="3" rx="1.5" />
        </g>
        <g fill="#d0dce8">
          <rect x="18" y="72" width="60" height="2.5" rx="1.25" />
          <rect x="18" y="80" width="53" height="2.5" rx="1.25" />
          <rect x="18" y="88" width="58" height="2.5" rx="1.25" />
          <rect x="95" y="72" width="59" height="2.5" rx="1.25" />
          <rect x="95" y="80" width="49" height="2.5" rx="1.25" />
          <rect x="95" y="88" width="56" height="2.5" rx="1.25" />
        </g>
        <path d="M18 106H154" stroke="#e4ebf2" />
        <rect x="18" y="118" width="38" height="3" rx="1.5" fill="#95b6d8" />
        <rect x="127" y="118" width="27" height="3" rx="1.5" fill="#d0dce8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 172 215" className="size-full" fill="none">
      <path
        d="M12 .5H144L171.5 28V203A11.5 11.5 0 0 1 160 214.5H12A11.5 11.5 0 0 1 .5 203V12A11.5 11.5 0 0 1 12 .5Z"
        fill="white"
        stroke="#dde6ef"
        strokeLinejoin="round"
      />
      <path d="M144 .5V20A8 8 0 0 0 152 28H171.5" fill="#edf3fa" stroke="#d7e3ef" />
      <rect x="18" y="25" width="66" height="5.5" rx="2.75" fill="#304b67" />
      <rect x="18" y="38" width="95" height="2.5" rx="1.25" fill="#a7c3de" />
      <path d="M18 55H154" stroke="#e4ebf2" />
      <rect x="18" y="72" width="50" height="3" rx="1.5" fill="#809bb6" />
      <g fill="#d0dce8">
        <rect x="18" y="84" width="132" height="2.5" rx="1.25" />
        <rect x="18" y="92" width="125" height="2.5" rx="1.25" />
        <rect x="18" y="100" width="134" height="2.5" rx="1.25" />
        <rect x="18" y="108" width="91" height="2.5" rx="1.25" />
      </g>
      <rect x="18" y="128" width="62" height="3" rx="1.5" fill="#809bb6" />
      <g fill="#d0dce8">
        <rect x="18" y="140" width="130" height="2.5" rx="1.25" />
        <rect x="18" y="148" width="118" height="2.5" rx="1.25" />
        <rect x="18" y="156" width="132" height="2.5" rx="1.25" />
        <rect x="18" y="164" width="76" height="2.5" rx="1.25" />
      </g>
      <path d="M18 184H154" stroke="#e4ebf2" />
      <rect x="18" y="195" width="34" height="2.5" rx="1.25" fill="#95b6d8" />
      <rect x="132" y="195" width="22" height="2.5" rx="1.25" fill="#d0dce8" />
    </svg>
  );
}

export function EncryptionProductVisual() {
  const { scope, isInView, reduceMotion } = useProductDemoPlayback(createSequence, { speed: playbackSpeed });

  useEffect(() => {
    const composition = scope.current?.querySelector<HTMLElement>('.encryption-demo-scene');
    if (!composition || reduceMotion || !isInView) return;

    const packets = Array.from(composition.querySelectorAll<HTMLElement>('.encryption-demo-cipher'), (packet) =>
      Array.from(packet.querySelectorAll<HTMLElement>('.encryption-demo-glyph')),
    );
    let lastStep = -1;
    let interval: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      const style = getComputedStyle(composition);
      const position = Number.parseFloat(style.getPropertyValue('--packet-x'));
      if (position <= 10 || position >= 100) return;
      // The displayed Motion clock also pauses offscreen. Glyph changes have no
      // independent timer that could drift away from the document's passage.
      // Keep their cadence independent of the document's playback speed.
      const step = Math.floor((Number.parseFloat(style.getPropertyValue('--cipher-time')) / playbackSpeed) * 1.2);
      if (step === lastStep) return;
      lastStep = step;
      const glyphs = packets[Number(style.getPropertyValue('--document-format'))];
      for (const [index, glyph] of glyphs.entries()) {
        const period = 5 + ((index * 7) % 13);
        const generation = Math.floor((step + (index % period)) / period);
        const character = CIPHER_ALPHABET[(index * 17 + generation * 37) % CIPHER_ALPHABET.length];
        if (glyph.textContent !== character) glyph.textContent = character;
        glyph.toggleAttribute('data-lit', (index * 17 + Math.floor(step / 3) * 23) % 127 < 3);
      }
    };
    const syncPlayback = () => {
      clearInterval(interval);
      if (!document.hidden) {
        update();
        interval = setInterval(update, 300);
      }
    };
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', syncPlayback);
    };
  }, [scope, isInView, reduceMotion]);

  return (
    <div
      ref={scope}
      className="relative flex size-full items-center justify-center px-5 py-3"
      role="img"
      aria-label="Abstract documents cross an encryption boundary and progressively become unreadable ciphertext."
    >
      <div
        key={reduceMotion ? 'static' : 'animated'}
        className="encryption-demo-scene relative h-full max-h-[310px] w-full max-w-[430px] [container-type:size]"
        style={{ '--packet-x': reduceMotion ? 30 : 5, '--document-format': 0, '--cipher-time': 0 } as CSSProperties}
        aria-hidden="true"
      >
        <div className="encryption-demo-stream absolute inset-0">
          <div className="encryption-demo-input-mask absolute inset-0">
            {DOCUMENT_FORMATS.map((format) => {
              const landscape = format === 'landscape';
              return (
                <div
                  key={format}
                  className={`encryption-demo-packet encryption-demo-paper absolute top-1/2 left-0 w-[40%] -translate-y-1/2 ${landscape ? 'h-[34cqw]' : 'h-[50cqw]'}`}
                  style={{
                    opacity: landscape ? 'var(--document-format)' : 'calc(1 - var(--document-format))',
                    transform: `translateX(${reduceMotion ? 75 : 12.5}%)`,
                  }}
                >
                  <AbstractDocument landscape={landscape} />
                </div>
              );
            })}
          </div>
          <div className="encryption-demo-output-mask absolute inset-0">
            {DOCUMENT_FORMATS.map((format) => {
              const landscape = format === 'landscape';
              const lines = landscape ? CIPHERTEXT.slice(0, 8) : CIPHERTEXT;
              return (
                <div
                  key={format}
                  className={`encryption-demo-packet encryption-demo-cipher absolute top-1/2 left-0 w-[40%] -translate-y-1/2 overflow-hidden font-mono text-[2.9cqw] leading-none text-[#6f8ba7] ${landscape ? 'h-[34cqw]' : 'h-[50cqw]'}`}
                  style={{
                    opacity: landscape ? 'var(--document-format)' : 'calc(1 - var(--document-format))',
                    transform: `translateX(${reduceMotion ? 75 : 12.5}%)`,
                  }}
                >
                  <div className="grid h-full auto-rows-fr items-center">
                    {lines.map((line) => (
                      <div key={line} className="grid grid-cols-[repeat(21,minmax(0,1fr))] text-center">
                        {Array.from(line, (character, column) => (
                          // A column keeps its identity and position as its glyph changes.
                          <span key={`${line}-${column}`} className="encryption-demo-glyph">
                            {character}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="encryption-demo-boundary absolute top-1/2 left-1/2 h-[84%] w-[2px] -translate-x-1/2 -translate-y-1/2" />
        <EncryptionBoundaryScene active={isInView} reduceMotion={reduceMotion} />
      </div>
    </div>
  );
}
