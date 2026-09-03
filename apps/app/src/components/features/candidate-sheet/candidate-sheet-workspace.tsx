import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { useMediaQuery } from '@comitium/ui/use-media-query';
import { type ReactNode, useCallback, useState } from 'react';

import {
  CandidateCollaboration,
  type CandidateCollaborationProps,
  type CandidateCollaborationTab,
  isCandidateCollaborationTab,
} from './collaboration';
import { WorkspaceTabsNavigation } from './workspace-tabs-navigation';

type CoreWorkspaceTab = 'activities' | 'overview' | 'resume';
type CompactWorkspaceTab = CoreWorkspaceTab | CandidateCollaborationTab;

type CollaborationProps = Omit<CandidateCollaborationProps, 'activeTab' | 'variant' | 'onTabChange'>;

interface CandidateSheetWorkspaceProps {
  considerationRail: ReactNode;
  considerationSelector: ReactNode;
  activities: ReactNode;
  overview: ReactNode;
  resume: ReactNode;
  collaboration: CollaborationProps;
}

const CORE_TABS: { label: string; value: CoreWorkspaceTab }[] = [
  { label: 'Activities', value: 'activities' },
  { label: 'Overview', value: 'overview' },
  { label: 'Resume', value: 'resume' },
];

const COMPACT_TABS: { label: string; value: CompactWorkspaceTab }[] = [
  { label: 'Activities', value: 'activities' },
  { label: 'Overview', value: 'overview' },
  { label: 'Resume', value: 'resume' },
  { label: 'Feed', value: 'feed' },
  { label: 'Notes', value: 'notes' },
  { label: 'Feedback', value: 'feedback' },
  { label: 'Emails', value: 'emails' },
  { label: 'Forms', value: 'forms' },
];

export function CandidateSheetWorkspace({
  considerationRail,
  considerationSelector,
  activities,
  overview,
  resume,
  collaboration,
}: CandidateSheetWorkspaceProps) {
  const hasPanelLayout = useMediaQuery('(min-width: 900px)');
  const [activeCoreTab, setActiveCoreTab] = useState<CoreWorkspaceTab>('activities');
  const [compactTab, setCompactTab] = useState<CompactWorkspaceTab>('activities');
  const [collaborationTab, setCollaborationTab] = useState<CandidateCollaborationTab>('feed');

  const handleCoreTabChange = useCallback((value: string) => {
    if (isCoreWorkspaceTab(value)) {
      setActiveCoreTab(value);
      setCompactTab(value);
    }
  }, []);

  const handleCompactTabChange = useCallback((value: string) => {
    if (isCoreWorkspaceTab(value)) {
      setActiveCoreTab(value);
      setCompactTab(value);

      return;
    }

    if (isCandidateCollaborationTab(value)) {
      setCompactTab(value);
      setCollaborationTab(value);
    }
  }, []);

  if (hasPanelLayout) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-[12rem_minmax(0,1.15fr)_minmax(20rem,1fr)] overflow-hidden bg-background">
        {considerationRail}

        <CoreWorkspace
          activeTab={activeCoreTab}
          activities={activities}
          overview={overview}
          resume={resume}
          onTabChange={handleCoreTabChange}
        />

        <CandidateCollaboration
          {...collaboration}
          activeTab={collaborationTab}
          variant="panel"
          onTabChange={setCollaborationTab}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {considerationSelector}

      <Tabs value={compactTab} onValueChange={handleCompactTabChange} className="relative flex min-h-0 flex-1 gap-0">
        <WorkspaceTabsNavigation>
          <div className="overflow-x-auto px-4 py-3">
            <TabsList className="w-max">
              {COMPACT_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </WorkspaceTabsNavigation>

        <TabsContent value={compactTab} className="mt-0 min-h-0 flex-1 overflow-hidden">
          <CompactWorkspaceContent
            activeTab={compactTab}
            activities={activities}
            overview={overview}
            resume={resume}
            collaboration={collaboration}
            onCollaborationTabChange={setCollaborationTab}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface CoreWorkspaceProps {
  activeTab: CoreWorkspaceTab;
  activities: ReactNode;
  overview: ReactNode;
  resume: ReactNode;
  onTabChange: (value: string) => void;
}

function CoreWorkspace({ activeTab, activities, overview, resume, onTabChange }: CoreWorkspaceProps) {
  return (
    <div className="min-h-0 min-w-0 overflow-hidden bg-background">
      <Tabs value={activeTab} onValueChange={onTabChange} className="relative flex h-full flex-col">
        <WorkspaceTabsNavigation>
          <TabsList className="mx-4 my-3">
            {CORE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </WorkspaceTabsNavigation>

        <TabsContent value="overview" className="mt-0 min-h-0 flex-1">
          {overview}
        </TabsContent>
        <TabsContent value="activities" className="mt-0 min-h-0 flex-1">
          {activities}
        </TabsContent>
        <TabsContent value="resume" className="mt-0 min-h-0 flex-1">
          {resume}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface CompactWorkspaceContentProps {
  activeTab: CompactWorkspaceTab;
  activities: ReactNode;
  overview: ReactNode;
  resume: ReactNode;
  collaboration: CollaborationProps;
  onCollaborationTabChange: (tab: CandidateCollaborationTab) => void;
}

function CompactWorkspaceContent({
  activeTab,
  activities,
  overview,
  resume,
  collaboration,
  onCollaborationTabChange,
}: CompactWorkspaceContentProps) {
  if (activeTab === 'overview') {
    return overview;
  }

  if (activeTab === 'activities') {
    return activities;
  }

  if (activeTab === 'resume') {
    return resume;
  }

  return (
    <CandidateCollaboration
      {...collaboration}
      activeTab={activeTab}
      variant="compact"
      onTabChange={onCollaborationTabChange}
    />
  );
}

function isCoreWorkspaceTab(value: string): value is CoreWorkspaceTab {
  return value === 'activities' || value === 'overview' || value === 'resume';
}
