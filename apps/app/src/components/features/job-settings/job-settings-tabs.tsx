import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import type { ReactNode } from 'react';

interface JobSettingsTabsProps {
  basic: ReactNode;
  hiringTeam: ReactNode;
  initialTab?: JobSettingsTab;
}

export type JobSettingsTab = 'basic' | 'hiring-team';

export function JobSettingsTabs({ basic, hiringTeam, initialTab = 'basic' }: JobSettingsTabsProps) {
  return (
    <Tabs defaultValue={initialTab} className="min-w-0 gap-6">
      <div className="overflow-x-auto pb-1">
        <TabsList variant="line" className="min-w-max justify-start">
          <TabsTrigger value="basic" className="flex-none">
            Basic
          </TabsTrigger>
          <TabsTrigger value="hiring-team" className="flex-none">
            Hiring team
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="basic">{basic}</TabsContent>
      <TabsContent value="hiring-team">{hiringTeam}</TabsContent>
    </Tabs>
  );
}
