import { ActivityEventRow } from '@comitium/ui/activity-feed';
import { ActivityIcon } from '@comitium/ui/activity-icon';
import { Button } from '@comitium/ui/button';
import { Card } from '@comitium/ui/card';
import { cn } from '@comitium/ui/cn';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import {
  KANBAN_CARD_SURFACE_CLASS,
  KANBAN_COLUMN_BODY_CLASS,
  KANBAN_COLUMN_CLASS,
  KanbanCardBody,
  KanbanColumnHeader,
} from '@comitium/ui/kanban';
import { PipelineStageTabs } from '@comitium/ui/pipeline-stage-tabs';
import { StatusBadge, type StatusBadgeProps } from '@comitium/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@comitium/ui/tooltip';
import { BadgeCheck, Calendar, CalendarCheck, ChevronRight, Clock, FileCheck, Mail } from 'lucide-react';
import { useState } from 'react';
import { LANDING_SECONDARY_ICON_CLASS_NAME, LANDING_TEXT_TONES_CLASS_NAME } from './landing-layout';
import { LandingSurfaceLight } from './landing-surface-light';

type FeedItem =
  | { kind: 'event'; actor: string | null; label: string; subline: string | null; time: string }
  | { kind: 'note'; author: string; body: string; time: string }
  | { kind: 'email'; from: string; to: string; subject: string; body: string; time: string };

type PreviewInterview = { interviewer: string } & (
  | { status: 'needs_scheduling' | 'link_sent' }
  | { status: 'scheduled' | 'completed'; month: string; day: string; time: string }
);

type PreviewActivity =
  | { kind: 'schedule'; title: string; duration: number; bookingLinkSent: boolean }
  | { kind: 'email'; template: string }
  | { kind: 'review'; form: string; submitted: number; required: number }
  | { kind: 'feedback'; title: string; submitted: number; required: number };

interface PreviewCandidate {
  id: string;
  name: string;
  company: string;
  headline: string;
  stage: string;
  status: StatusBadgeProps;
  inStage: string;
  interview: PreviewInterview;
  feedback?: { submitted: number; required: number };
  activities: PreviewActivity[];
  feed: FeedItem[];
}

const STAGES = ['Recruiter screen', 'Portfolio review', 'Hiring manager'];

const SHEET_TABS = [
  { value: 'feed', label: 'Feed' },
  { value: 'notes', label: 'Notes' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'emails', label: 'Emails' },
  { value: 'forms', label: 'Forms' },
];

const TEAM_AVATARS: Record<string, string> = {
  'Grace Liu': '/images/hero-members/grace-liu.webp',
  'Noah Patel': '/images/hero-members/noah-patel.webp',
  'Ava Brooks': '/images/hero-members/ava-brooks.webp',
};

// One fictional Senior Product Designer opening, as of Thursday, Oct 8, 2026, 16:00.
// Grace recruits, Noah reviews design work, and Ava is the hiring manager and current viewer.
// Completed-stage badges count application reviews and interview feedback together.
const CANDIDATES: PreviewCandidate[] = [
  {
    id: 'maya',
    name: 'Maya Chen',
    company: 'Pillbox',
    headline: 'Product Designer at Pillbox',
    stage: 'Portfolio review',
    status: { variant: 'success', label: 'Scheduled · Oct 9' },
    inStage: '2d',
    interview: { status: 'scheduled', interviewer: 'Noah Patel', month: 'Oct', day: '9', time: '10:30 – 11:15' },
    activities: [
      { kind: 'review', form: 'Portfolio', submitted: 0, required: 2 },
      { kind: 'email', template: 'Portfolio prep' },
    ],
    feed: [
      {
        kind: 'event',
        actor: 'Grace Liu',
        label: 'Interview scheduled',
        subline: null,
        time: '1h ago',
      },
      {
        kind: 'email',
        from: 'Maya Chen',
        to: 'hiring@example.com',
        subject: 'Re: Portfolio review',
        body: 'Friday at 10:30 works for me. I’ll walk Noah through the Pillbox booking flow. The chance to keep working directly with care teams is a big part of what interested me in the role.',
        time: '2h ago',
      },
      {
        kind: 'email',
        from: 'Grace Liu',
        to: 'maya@example.com',
        subject: 'Portfolio review',
        body: 'Hi Maya, we’d like to arrange a 45-minute portfolio conversation with Noah, our senior designer. Would Friday, Oct 9 at 10:30 work for you? I’ll send the preparation notes once we confirm.',
        time: '3h ago',
      },
      {
        kind: 'note',
        author: 'Noah Patel',
        body: 'Maya shadowed nurses before redesigning the booking flow. Ask what those visits changed, not just how the final screens look.',
        time: '1d ago',
      },
      { kind: 'event', actor: 'Grace Liu', label: 'Moved to Portfolio review', subline: null, time: '2d ago' },
      {
        kind: 'event',
        actor: 'Grace Liu',
        label: 'Feedback submitted',
        subline: null,
        time: '2d ago',
      },
      { kind: 'event', actor: 'Grace Liu', label: 'Interview completed', subline: null, time: '2d ago' },
      {
        kind: 'event',
        actor: null,
        label: 'Application submitted',
        subline: null,
        time: '4d ago',
      },
    ],
  },
  {
    id: 'daniel',
    name: 'Daniel Okafor',
    company: 'Fieldnote',
    headline: 'Product Designer at Fieldnote',
    stage: 'Recruiter screen',
    status: { variant: 'success', label: 'Scheduled · Oct 9' },
    inStage: '2d',
    interview: { status: 'scheduled', interviewer: 'Grace Liu', month: 'Oct', day: '9', time: '14:00 – 14:30' },
    activities: [{ kind: 'email', template: 'Screen prep' }],
    feed: [
      {
        kind: 'event',
        actor: 'Grace Liu',
        label: 'Interview scheduled',
        subline: null,
        time: '3h ago',
      },
      {
        kind: 'email',
        from: 'Daniel Okafor',
        to: 'hiring@example.com',
        subject: 'Re: Recruiter screen',
        body: 'Friday at 14:00 works. I’d like to hear more about how much discovery the designer owns — that’s something I’m looking for in my next role. Thanks, Daniel.',
        time: '5h ago',
      },
      {
        kind: 'note',
        author: 'Grace Liu',
        body: 'Daniel led the Fieldnote onboarding redesign from research to launch. Leave time for his questions about design ownership.',
        time: '7h ago',
      },
      {
        kind: 'email',
        from: 'Grace Liu',
        to: 'daniel@example.com',
        subject: 'Recruiter screen',
        body: 'Hi Daniel, your Fieldnote onboarding case study caught my eye. Would Oct 9 at 14:00 work for a first conversation? I’d love to hear how you approached it.',
        time: '1d ago',
      },
      { kind: 'event', actor: 'Grace Liu', label: 'Moved to Recruiter screen', subline: null, time: '2d ago' },
      { kind: 'event', actor: null, label: 'Application submitted', subline: null, time: '4d ago' },
    ],
  },
  {
    id: 'sofia',
    name: 'Sofia Lindqvist',
    company: 'Harbor Health',
    headline: 'Product Designer at Harbor Health',
    stage: 'Recruiter screen',
    status: { variant: 'warning', label: 'Needs scheduling' },
    inStage: '1d',
    interview: { status: 'needs_scheduling', interviewer: 'Grace Liu' },
    activities: [{ kind: 'email', template: 'Screen prep' }],
    feed: [
      {
        kind: 'email',
        from: 'Sofia Lindqvist',
        to: 'hiring@example.com',
        subject: 'Re: A first conversation',
        body: 'Thanks, Grace. I first heard about the product from a care team I worked with, so I’m keen to learn more. I’ll send a couple of times for next week this afternoon.',
        time: '1h ago',
      },
      {
        kind: 'email',
        from: 'Grace Liu',
        to: 'sofia@example.com',
        subject: 'A first conversation',
        body: 'Hi Sofia, I’d love to hear about the patient intake flow you designed at Harbor Health. Send over a couple of times that work next week and we’ll find a slot.',
        time: '2h ago',
      },
      {
        kind: 'note',
        author: 'Noah Patel',
        body: 'Sofia tested the intake flow with both patients and care teams. Start with how she balanced their different needs.',
        time: '5h ago',
      },
      { kind: 'event', actor: 'Grace Liu', label: 'Moved to Recruiter screen', subline: null, time: '1d ago' },
      { kind: 'event', actor: null, label: 'Application submitted', subline: null, time: '3d ago' },
    ],
  },
  {
    id: 'kenji',
    name: 'Kenji Watanabe',
    company: 'Tidepool',
    headline: 'Product Designer at Tidepool',
    stage: 'Recruiter screen',
    status: { variant: 'success', label: 'Scheduled · Oct 12' },
    inStage: '3d',
    interview: { status: 'scheduled', interviewer: 'Grace Liu', month: 'Oct', day: '12', time: '11:00 – 11:30' },
    activities: [],
    feed: [
      {
        kind: 'email',
        from: 'Kenji Watanabe',
        to: 'hiring@example.com',
        subject: 'Re: Recruiter screen',
        body: 'Thanks for moving this to Monday at 11:00. I tried the app before applying and have a few questions about the rescheduling flow. Looking forward to talking.',
        time: '1h ago',
      },
      {
        kind: 'event',
        actor: 'Grace Liu',
        label: 'Interview rescheduled',
        subline: 'from Oct 9, 11:00 AM to Oct 12, 11:00 AM',
        time: '2h ago',
      },
      {
        kind: 'email',
        from: 'Kenji Watanabe',
        to: 'hiring@example.com',
        subject: 'Re: Recruiter screen',
        body: 'A customer workshop has moved to Friday morning. Could we move our call to Monday, Oct 12 at 11:00? Sorry for the change.',
        time: '4h ago',
      },
      {
        kind: 'email',
        from: 'Grace Liu',
        to: 'kenji@example.com',
        subject: 'Before our conversation',
        body: 'Hi Kenji, we’ll spend 30 minutes talking about your recent design work and what you’re looking for next. No presentation needed. We’ll leave time for your questions about the role and team.',
        time: '5h ago',
      },
      {
        kind: 'event',
        actor: null,
        label: 'Interview scheduled',
        subline: null,
        time: '6h ago',
      },
      {
        kind: 'note',
        author: 'Grace Liu',
        body: 'Kenji designed Tidepool’s mobile booking flow. Ask how he kept rescheduling simple on a small screen.',
        time: '7h ago',
      },
      {
        kind: 'email',
        from: 'Grace Liu',
        to: 'kenji@example.com',
        subject: 'Recruiter screen',
        body: 'Hi Kenji, your Tidepool mobile case study looks relevant to what we’re building. Here’s a scheduling link for a 30-minute conversation about the role and your experience — pick a time that suits you.',
        time: '1d ago',
      },
      { kind: 'event', actor: 'Grace Liu', label: 'Scheduling link sent', subline: null, time: '1d ago' },
      { kind: 'event', actor: 'Grace Liu', label: 'Moved to Recruiter screen', subline: null, time: '3d ago' },
      { kind: 'event', actor: null, label: 'Application submitted', subline: null, time: '6d ago' },
    ],
  },
  {
    id: 'lucia',
    name: 'Lucía Ferreira',
    company: 'Kitewell',
    headline: 'Design Lead at Kitewell',
    stage: 'Portfolio review',
    status: { variant: 'destructive', label: 'Waiting on feedback' },
    inStage: '3d',
    interview: { status: 'completed', interviewer: 'Noah Patel', month: 'Oct', day: '7', time: '15:00 – 15:45' },
    feedback: { submitted: 0, required: 1 },
    activities: [
      { kind: 'review', form: 'Portfolio', submitted: 2, required: 2 },
      { kind: 'email', template: 'Next steps' },
    ],
    feed: [
      {
        kind: 'note',
        author: 'Ava Brooks',
        body: 'Lucía’s research summary is in the review materials. Noah still needs to submit feedback from yesterday’s conversation. Let’s thank her for the summary and confirm when she’ll hear from us after the debrief.',
        time: '1h ago',
      },
      {
        kind: 'email',
        from: 'Lucía Ferreira',
        to: 'hiring@example.com',
        subject: 'Thanks for yesterday',
        body: 'Thanks to Noah for the conversation yesterday. I’ve attached the research summary he asked about. Hearing that engineers join your customer visits was encouraging — that’s how I like to work too.',
        time: '2h ago',
      },
      {
        kind: 'event',
        actor: 'Grace Liu',
        label: 'Feedback submitted',
        subline: null,
        time: '5h ago',
      },
      { kind: 'event', actor: 'Noah Patel', label: 'Interview completed', subline: null, time: '1d ago' },
      {
        kind: 'email',
        from: 'Grace Liu',
        to: 'lucia@example.com',
        subject: 'Your portfolio conversation',
        body: 'Hi Lucía, you’re confirmed for Oct 7 at 15:00 with Noah. Please bring one project that shows how research shaped your design decisions. We’ll leave time for your questions too.',
        time: '2d ago',
      },
      {
        kind: 'event',
        actor: 'Grace Liu',
        label: 'Interview scheduled',
        subline: null,
        time: '2d ago',
      },
      { kind: 'event', actor: 'Noah Patel', label: 'Feedback submitted', subline: null, time: '2d ago' },
      { kind: 'event', actor: 'Grace Liu', label: 'Moved to Portfolio review', subline: null, time: '3d ago' },
      {
        kind: 'event',
        actor: null,
        label: 'Application submitted',
        subline: null,
        time: '7d ago',
      },
    ],
  },
  {
    id: 'arjun',
    name: 'Arjun Mehta',
    company: 'Parcelly',
    headline: 'Senior Product Designer at Parcelly',
    stage: 'Hiring manager',
    status: { variant: 'warning', label: 'Booking link sent' },
    inStage: '1d',
    interview: { status: 'link_sent', interviewer: 'Ava Brooks' },
    activities: [
      { kind: 'review', form: 'Hiring assessment', submitted: 2, required: 2 },
      { kind: 'email', template: 'Interview prep' },
    ],
    feed: [
      {
        kind: 'email',
        from: 'Arjun Mehta',
        to: 'hiring@example.com',
        subject: 'Re: Your conversation with Ava',
        body: 'Thanks, Grace. I’ll choose a time for next week once I’ve checked my calendar. I’d like to ask Ava how the team measures the impact of design on missed appointments — that problem is what drew me to the role.',
        time: '1h ago',
      },
      {
        kind: 'email',
        from: 'Grace Liu',
        to: 'arjun@example.com',
        subject: 'Your conversation with Ava',
        body: 'Hi Arjun, the next step is a 45-minute conversation with Ava, our design manager. Please use your booking link to choose a time next week. We’ll send an agenda once you’ve booked.',
        time: '2h ago',
      },
      { kind: 'event', actor: 'Grace Liu', label: 'Scheduling link sent', subline: null, time: '2h ago' },
      {
        kind: 'note',
        author: 'Noah Patel',
        body: 'Grace and I have finished the background review. Arjun showed how his delivery dashboard changed after testing with dispatchers. Ava can explore how he chose what to simplify.',
        time: '3h ago',
      },
      { kind: 'event', actor: 'Grace Liu', label: 'Feedback submitted', subline: null, time: '4h ago' },
      { kind: 'event', actor: 'Noah Patel', label: 'Feedback submitted', subline: null, time: '6h ago' },
      { kind: 'event', actor: 'Grace Liu', label: 'Moved to Hiring manager', subline: null, time: '1d ago' },
      {
        kind: 'event',
        actor: 'Noah Patel',
        label: 'Feedback submitted',
        subline: null,
        time: '1d ago',
      },
      {
        kind: 'event',
        actor: 'Noah Patel',
        label: 'Interview completed',
        subline: null,
        time: '2d ago',
      },
      {
        kind: 'note',
        author: 'Noah Patel',
        body: 'Arjun’s portfolio conversation covered the delivery dashboard and his research with dispatchers. The next round can focus on prioritization and working with the wider team.',
        time: '2d ago',
      },
      { kind: 'event', actor: null, label: 'Application submitted', subline: null, time: '8d ago' },
    ],
  },
  {
    id: 'amara',
    name: 'Amara Nwosu',
    company: 'Lumen',
    headline: 'Senior Product Designer at Lumen',
    stage: 'Hiring manager',
    status: { variant: 'warning', label: 'In review · 2/3' },
    inStage: '3d',
    interview: { status: 'completed', interviewer: 'Ava Brooks', month: 'Oct', day: '6', time: '13:00 – 13:45' },
    feedback: { submitted: 1, required: 1 },
    activities: [
      { kind: 'review', form: 'Hiring assessment', submitted: 1, required: 2 },
      { kind: 'email', template: 'Next steps' },
    ],
    feed: [
      {
        kind: 'note',
        author: 'Grace Liu',
        body: 'Ava’s interview feedback and Noah’s assessment are in. I still need to finish my review before the hiring debrief. Amara also asked to meet Customer Success if we move forward.',
        time: '3h ago',
      },
      {
        kind: 'event',
        actor: 'Noah Patel',
        label: 'Feedback submitted',
        subline: null,
        time: '4h ago',
      },
      {
        kind: 'email',
        from: 'Amara Nwosu',
        to: 'hiring@example.com',
        subject: 'A thought after our conversation',
        body: 'Thanks again for the conversation, Ava. I’ve been thinking about the patient handoff problem we discussed. I’d be interested in meeting someone from Customer Success to understand where those gaps show up day to day.',
        time: '22h ago',
      },
      {
        kind: 'event',
        actor: 'Ava Brooks',
        label: 'Feedback submitted',
        subline: null,
        time: '1d ago',
      },
      {
        kind: 'event',
        actor: 'Ava Brooks',
        label: 'Interview completed',
        subline: null,
        time: '2d ago',
      },
      { kind: 'event', actor: 'Grace Liu', label: 'Moved to Hiring manager', subline: null, time: '3d ago' },
      { kind: 'event', actor: null, label: 'Application submitted', subline: null, time: '7d ago' },
    ],
  },
  {
    id: 'tom',
    name: 'Tom Becker',
    company: 'Odeon',
    headline: 'Product Designer at Odeon',
    stage: 'Hiring manager',
    status: { variant: 'destructive', label: 'Needs decision' },
    inStage: '2d',
    interview: { status: 'completed', interviewer: 'Ava Brooks', month: 'Oct', day: '7', time: '11:00 – 11:45' },
    feedback: { submitted: 1, required: 1 },
    activities: [
      { kind: 'review', form: 'Hiring assessment', submitted: 2, required: 2 },
      { kind: 'email', template: 'Next steps' },
      { kind: 'email', template: 'Reference check consent' },
    ],
    feed: [
      {
        kind: 'email',
        from: 'Tom Becker',
        to: 'hiring@example.com',
        subject: 'Thank you',
        body: 'Thanks for the conversation yesterday. The appointment dashboard sounds like a good fit for the workflow work I did at Odeon. Happy to answer any follow-up questions.',
        time: '30m ago',
      },
      {
        kind: 'note',
        author: 'Noah Patel',
        body: 'All three reviews are in. Tom is also speaking with another team next week. Let’s make a decision at tomorrow’s debrief and get back to him before the weekend. Ask for his consent before contacting references.',
        time: '1h ago',
      },
      {
        kind: 'event',
        actor: 'Ava Brooks',
        label: 'Feedback submitted',
        subline: null,
        time: '3h ago',
      },
      {
        kind: 'event',
        actor: 'Noah Patel',
        label: 'Feedback submitted',
        subline: null,
        time: '7h ago',
      },
      {
        kind: 'event',
        actor: 'Grace Liu',
        label: 'Feedback submitted',
        subline: null,
        time: '1d ago',
      },
      {
        kind: 'event',
        actor: 'Ava Brooks',
        label: 'Interview completed',
        subline: null,
        time: '1d ago',
      },
      { kind: 'event', actor: 'Grace Liu', label: 'Moved to Hiring manager', subline: null, time: '2d ago' },
      { kind: 'event', actor: null, label: 'Application submitted', subline: null, time: '9d ago' },
    ],
  },
];

const COLUMNS = STAGES.map((stage) => ({
  name: stage,
  candidates: CANDIDATES.filter((candidate) => candidate.stage === stage),
}));

const STAGE_TABS = [
  { value: 'review', label: 'Application review', count: 24 },
  { value: 'active', label: 'Active', count: CANDIDATES.length },
  { value: 'offer', label: 'Offer', count: 3 },
  { value: 'hired', label: 'Hired', count: 1 },
];

function getFeedKey(item: FeedItem) {
  if (item.kind === 'email') {
    return `email:${item.subject}:${item.time}`;
  }

  if (item.kind === 'note') {
    return `note:${item.author}:${item.time}`;
  }

  return `event:${item.label}:${item.time}`;
}

function PreviewMemberAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <InitialsAvatar
      identity={{ name }}
      imageSrc={TEAM_AVATARS[name]}
      size="sm"
      className={cn('shrink-0 [&_img]:object-[50%_25%]', className)}
    />
  );
}

function PreviewKanbanCard({
  candidate,
  isSelected,
  onSelect,
}: {
  candidate: PreviewCandidate;
  isSelected: boolean;
  onSelect: (candidate: PreviewCandidate) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={`Open ${candidate.name}`}
      onClick={() => onSelect(candidate)}
      className={cn(
        KANBAN_CARD_SURFACE_CLASS,
        'hero-candidate-card outline-none transition-[border-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
        isSelected && 'hero-candidate-card-selected',
      )}
    >
      <KanbanCardBody
        name={candidate.name}
        company={candidate.company}
        status={candidate.status}
        footer={<span className="text-[color:var(--landing-text-meta)]">In stage {candidate.inStage}</span>}
      />
    </button>
  );
}

function FeedEntry({ item, candidateName }: { item: FeedItem; candidateName: string }) {
  if (item.kind === 'note') {
    return (
      <Card size="sm" className="gap-0 py-0">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <PreviewMemberAvatar name={item.author} />
          <span className="min-w-0 flex-1 truncate text-label-13 font-medium">{item.author}</span>
          <span className="shrink-0 text-label-12 text-[color:var(--landing-text-meta)]">{item.time}</span>
        </div>
        <p className="px-4 pb-4 text-copy-13 text-[color:var(--landing-text-content)]">{item.body}</p>
      </Card>
    );
  }

  if (item.kind === 'email') {
    return (
      <Card size="sm" className="gap-0 py-0">
        <div className="flex items-center gap-2 border-b border-separator px-4 py-2.5">
          {item.from !== candidateName && <PreviewMemberAvatar name={item.from} />}
          <div className="min-w-0 flex-1">
            <p className="text-label-13 font-medium">{item.from}</p>
            <p className="truncate text-label-12 text-[color:var(--landing-text-meta)]">to: {item.to}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Mail aria-hidden className={cn('size-3.5', LANDING_SECONDARY_ICON_CLASS_NAME)} />
            <span className="text-label-12 text-[color:var(--landing-text-meta)]">{item.time}</span>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="mb-1.5 text-label-13 font-medium">{item.subject}</p>
          <p className="text-copy-13 text-[color:var(--landing-text-content)]">{item.body}</p>
        </div>
      </Card>
    );
  }

  const EventIcon = item.label === 'Application submitted' ? FileCheck : CalendarCheck;

  return (
    <div className={cn(!item.actor && '[&>div]:items-center')}>
      <ActivityEventRow
        avatar={
          item.actor ? (
            <PreviewMemberAvatar name={item.actor} className="mt-0.5" />
          ) : (
            <span className="flex size-6 shrink-0 items-center justify-center">
              <EventIcon aria-hidden className={cn('size-4', LANDING_SECONDARY_ICON_CLASS_NAME)} />
            </span>
          )
        }
        label={item.label}
        actor={item.actor}
        subline={item.subline}
        time={<span className="shrink-0 text-label-12 text-[color:var(--landing-text-meta)]">{item.time}</span>}
      />
    </div>
  );
}

function PreviewActivityRow({ activity }: { activity: PreviewActivity }) {
  let title: string;
  let detail: string | null = null;
  let progress: string | null = null;

  switch (activity.kind) {
    case 'schedule':
      title = activity.bookingLinkSent ? 'Awaiting booking' : 'Schedule interview';
      detail = `${activity.title} · ${activity.duration} min`;
      break;
    case 'email':
      title = `Send: ${activity.template}`;
      break;
    case 'review':
      title = 'Application Review';
      detail = activity.form;
      progress = `${activity.submitted}/${activity.required} reviewed`;
      break;
    case 'feedback':
      title = 'Interview feedback';
      detail = activity.title;
      progress = `${activity.submitted}/${activity.required} submitted`;
      break;
  }

  return (
    <div className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 py-3">
      <ActivityIcon kind={activity.kind} />
      <div className="min-w-0">
        <p className="text-label-14 font-medium text-[color:var(--landing-text-content)]">{title}</p>
        {detail && (
          <p className="mt-0.5 text-copy-12 text-[color:var(--landing-text-meta)]">
            {detail}
            {progress && (
              <>
                {' · '}
                <span className="text-[color:var(--landing-text-context)]">{progress}</span>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function ScheduledInterview({
  stage,
  interview,
}: {
  stage: string;
  interview: Exclude<PreviewInterview, { status: 'needs_scheduling' | 'link_sent' }>;
}) {
  return (
    <Card size="sm" className="gap-0 py-0">
      <div className="px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-label-14 font-medium">{stage}</p>
          <StatusBadge variant="success" label="Scheduled" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-label-12 tabular-nums">
          <p className="flex items-center gap-1.5">
            <Calendar aria-hidden className={cn('size-3.5', LANDING_SECONDARY_ICON_CLASS_NAME)} />
            {interview.month} {interview.day}
          </p>
          <p className="flex items-center gap-1.5">
            <Clock aria-hidden className={cn('size-3.5', LANDING_SECONDARY_ICON_CLASS_NAME)} />
            {interview.time}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-separator px-3 py-3">
        <div className="flex items-center gap-2">
          <PreviewMemberAvatar name={interview.interviewer} />
          <span className="text-label-12">{interview.interviewer}</span>
        </div>
        <span className="flex items-center gap-1.5 text-label-12 text-muted-foreground">
          <img src="/images/google-meet.webp" alt="" width="14" height="14" className="size-3.5 shrink-0" />
          Google Meet
        </span>
      </div>
    </Card>
  );
}

function CandidateActivities({ candidate }: { candidate: PreviewCandidate }) {
  const interview = candidate.interview;
  const activities = candidate.activities.filter(
    (activity) => activity.kind !== 'review' || activity.submitted < activity.required,
  );

  if (interview.status === 'needs_scheduling' || interview.status === 'link_sent') {
    activities.unshift({
      kind: 'schedule',
      title: candidate.stage,
      duration: candidate.stage === 'Recruiter screen' ? 30 : 45,
      bookingLinkSent: interview.status === 'link_sent',
    });
  }

  if (
    interview.status === 'completed' &&
    candidate.feedback &&
    candidate.feedback.submitted < candidate.feedback.required
  ) {
    activities.unshift({
      kind: 'feedback',
      title: candidate.stage,
      submitted: candidate.feedback.submitted,
      required: candidate.feedback.required,
    });
  }

  return (
    <section aria-label="Activities" className="space-y-3">
      <h3 className="text-heading-14">Activities</h3>
      {activities.length > 0 && (
        <Card size="sm" className="gap-0 py-0">
          <div className="divide-y divide-separator">
            {activities.map((activity) => (
              <PreviewActivityRow
                key={activity.kind === 'email' ? `email:${activity.template}` : activity.kind}
                activity={activity}
              />
            ))}
          </div>
        </Card>
      )}
      {interview.status === 'scheduled' && <ScheduledInterview stage={candidate.stage} interview={interview} />}
    </section>
  );
}

function CandidatePanel({ candidate }: { candidate: PreviewCandidate }) {
  return (
    <div className="hero-candidate-panel hero-workspace relative min-w-0 overflow-hidden rounded-b-[1.25rem] bg-background min-[90rem]:mt-9 min-[90rem]:-ml-6 min-[90rem]:rounded-[1.25rem]">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate text-heading-20">{candidate.name}</p>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Identity verified"
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <BadgeCheck
                      aria-hidden
                      strokeWidth={2}
                      className="size-4.5 [&>path:first-child]:fill-current [&>path:last-child]:stroke-primary-foreground"
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  sideOffset={8}
                  className="max-w-64 flex-col items-start gap-1 px-3 py-2 [&>span>svg]:h-1.5 [&>span>svg]:w-3 [&>span>svg]:translate-y-0 [&>span>svg]:rotate-0 [&>span>svg]:rounded-none [&>span>svg]:bg-transparent"
                >
                  <p className="font-medium">Identity verified</p>
                  <p className="leading-relaxed text-background/80">Verified using Zero Knowledge proofs</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="mt-1 text-label-13 text-[color:var(--landing-text-context)]">{candidate.headline}</p>
          <div className="mt-3">
            <StatusBadge {...candidate.status} />
          </div>
        </div>
        <Button type="button" variant="outline" className="px-4">
          <Mail aria-hidden data-icon="inline-start" className={cn('size-4', LANDING_SECONDARY_ICON_CLASS_NAME)} />
          Email
        </Button>
      </div>
      <div className="hero-sheet-workspace grid min-w-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Tabs value="activities" className="min-w-0 gap-0">
          <div className="px-3 pt-2 pb-3">
            <TabsList aria-label="Candidate workspace" className="hero-sheet-tabs w-full gap-1">
              <TabsTrigger value="activities" className="px-2 text-xs">
                Activities
              </TabsTrigger>
              <TabsTrigger value="overview" className="px-2 text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="resume" className="px-2 text-xs">
                Resume
              </TabsTrigger>
            </TabsList>
          </div>
          <div
            key={candidate.id}
            className="hero-candidate-content hero-activities-content overflow-y-auto px-4 py-4 md:h-[22rem]"
          >
            <TabsContent value="activities" className="mt-0">
              <CandidateActivities candidate={candidate} />
            </TabsContent>
          </div>
        </Tabs>
        <Tabs value="feed" className="min-w-0 gap-0">
          <div className="px-3 pt-2 pb-3">
            <TabsList aria-label="Candidate details" className="hero-sheet-tabs w-full gap-1">
              {SHEET_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 px-0.5 text-xs min-[360px]:px-1 min-[390px]:px-2"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div
            key={candidate.id}
            className="hero-candidate-content hero-feed-content h-[22rem] overflow-y-auto px-3 py-4"
          >
            <TabsContent value="feed" className="mt-0 space-y-2">
              {candidate.feed.map((item) => (
                <FeedEntry key={getFeedKey(item)} item={item} candidateName={candidate.name} />
              ))}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export function HeroProductPreview() {
  const [selected, setSelected] = useState(CANDIDATES[0]);

  return (
    <section
      aria-label="Comitium product preview"
      className={cn(
        'hero-product-stage pointer-events-auto relative isolate mx-auto mt-14 w-full overflow-hidden rounded-[clamp(1.75rem,3vw,2.75rem)] px-[clamp(0.75rem,4vw,3rem)] pt-[clamp(2rem,5vw,4.5rem)] pb-[clamp(1.5rem,4vw,3.5rem)] text-left sm:mt-16',
        LANDING_TEXT_TONES_CLASS_NAME,
      )}
    >
      <LandingSurfaceLight animated />
      <div className="hero-product-composition relative mx-auto min-w-0 max-w-5xl min-[90rem]:grid min-[90rem]:w-full min-[90rem]:max-w-[94.5rem] min-[90rem]:grid-cols-[minmax(0,0.52fr)_minmax(0,0.48fr)] min-[90rem]:items-start">
        <div className="hero-pipeline-panel hero-workspace min-w-0 overflow-hidden rounded-t-[1.25rem] bg-background min-[90rem]:rounded-[1.25rem]">
          <div className="min-w-0 p-3 min-[1440px]:p-5 min-[1440px]:pr-10">
            <div className="overflow-x-auto scrollbar-hide min-[1440px]:mb-5">
              <PipelineStageTabs
                tabs={STAGE_TABS}
                value="active"
                separator={
                  <ChevronRight aria-hidden className={cn('mx-0.5 size-4', LANDING_SECONDARY_ICON_CLASS_NAME)} />
                }
                className="hero-pipeline-tabs max-[390px]:[&_[data-slot=tabs-trigger]]:px-1 max-[390px]:[&_[data-slot=tabs-trigger]_span]:text-xs"
              />
            </div>
            <div className="hidden grid-cols-3 gap-1 min-[1440px]:grid">
              {COLUMNS.map((column) => (
                <div key={column.name} className={cn(KANBAN_COLUMN_CLASS, 'min-w-0 w-full p-0.5')}>
                  <KanbanColumnHeader name={column.name} total={column.candidates.length} />
                  <div className={cn(KANBAN_COLUMN_BODY_CLASS, 'hero-stage-column')}>
                    {column.candidates.map((candidate) => (
                      <PreviewKanbanCard
                        key={candidate.id}
                        candidate={candidate}
                        isSelected={candidate.id === selected.id}
                        onSelect={setSelected}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <section
            className="flex gap-2 overflow-x-auto border-t border-separator p-3 scrollbar-hide min-[1440px]:hidden"
            aria-label="Preview candidates"
          >
            {CANDIDATES.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-label={`Open ${candidate.name}`}
                aria-pressed={candidate.id === selected.id}
                onClick={() => setSelected(candidate)}
                className={cn(
                  'flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm outline-none transition-colors hover:bg-background/70 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                  candidate.id === selected.id && 'border-primary/20 bg-background shadow-xs',
                )}
              >
                {candidate.name}
              </button>
            ))}
          </section>
        </div>
        <CandidatePanel candidate={selected} />
      </div>
    </section>
  );
}
