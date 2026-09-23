import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import type { ReactNode } from 'react';

interface JobSettingsTabsProps {
  basic: ReactNode;
  hiringTeam: ReactNode;
}

export function JobSettingsTabs({ basic, hiringTeam }: JobSettingsTabsProps) {
  return (
    <Tabs defaultValue="basic" className="min-w-0 gap-6">
      <div className="overflow-x-auto pb-1">
        <TabsList variant="line" className="w-full min-w-max justify-start">
          <TabsTrigger value="basic" className="flex-none px-3">
            Basic
          </TabsTrigger>
          <TabsTrigger value="hiring-team" className="flex-none px-3">
            Hiring team
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="basic">{basic}</TabsContent>
      <TabsContent value="hiring-team">{hiringTeam}</TabsContent>
    </Tabs>
  );
}
