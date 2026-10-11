import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comitium/ui/accordion';
import { Link } from '@tanstack/react-router';

const FAQ_ITEMS = [
  {
    id: 'teams',
    question: 'Who is Comitium built for?',
    answer:
      'Startups and growing companies tired of sorting through mass applications and fake candidates. With Comitium, founders, recruiters and hiring managers hire together and hear only from real people genuinely interested in the role.',
  },
  {
    id: 'verification',
    question: 'How does identity verification work?',
    answer:
      'Every applicant on Comitium is a real person. Candidates scan their government-issued ID once with the ZKPassport app. Their phone reads the NFC chip and checks the issuing government’s cryptographic signature, so a forged or edited document can’t pass. The document then stays encrypted on their device. After that, they can prove it’s them in seconds at any time by scanning a QR code and matching their face to the photo in their ID. Comitium receives only a Zero Knowledge proof that the check passed; personal data never leaves their phone.',
  },
  {
    id: 'privacy',
    question: 'How is data protected?',
    answer: (
      <>
        Your hiring data is end-to-end encrypted by default, with nothing to set up. Only the people you give access to
        can read it. Post-quantum cryptography keeps it secure for years to come.{' '}
        <Link
          to="/encryption"
          className="font-medium text-link underline underline-offset-4 transition-colors hover:text-link/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Learn more
        </Link>
      </>
    ),
  },
  {
    id: 'ai',
    question: 'How does Comitium use AI?',
    answer:
      'AI takes care of the routine work, so your team spends less time on admin and more time with candidates. Hiring decisions always stay with your team.',
  },
];

export function LandingFaqSection() {
  return (
    <section
      className="mt-28 grid gap-8 sm:mt-36 sm:gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20"
      aria-labelledby="landing-faq-heading"
    >
      <h2
        id="landing-faq-heading"
        className="max-w-[26rem] text-3xl leading-[1.12] font-medium tracking-[-0.04em] sm:text-4xl lg:text-[2.75rem]"
      >
        Frequently asked questions
      </h2>
      <Accordion type="multiple" className="min-w-0 overflow-visible rounded-none border-0">
        {FAQ_ITEMS.map(({ id, question, answer }) => (
          <AccordionItem key={id} value={id} className="border-b border-separator data-open:bg-transparent">
            <AccordionTrigger className="items-center gap-6 rounded-lg border-0 px-0 py-6 text-base leading-6 font-medium transition-colors hover:text-muted-foreground hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 sm:text-lg sm:leading-7">
              {question}
            </AccordionTrigger>
            <AccordionContent className="h-auto px-0 pb-6 text-[0.9375rem] leading-7 text-muted-foreground sm:pr-10 sm:text-base">
              <p className="max-w-[42rem]">{answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
