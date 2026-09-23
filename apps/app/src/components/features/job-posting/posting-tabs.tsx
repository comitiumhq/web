import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import type { ReactNode } from 'react';

interface PostingTabsProps {
  description: ReactNode;
  applicationForm: ReactNode;
  capacity?: ReactNode;
}

export function PostingTabs({ description, applicationForm, capacity }: PostingTabsProps) {
  return (
    <Tabs defaultValue="description" className="min-w-0 gap-6">
      <div className="overflow-x-auto pb-1">
        <TabsList variant="line" className="w-full min-w-max justify-start">
          <TabsTrigger value="description" className="flex-none px-3">
            Description
          </TabsTrigger>
          <TabsTrigger value="application-form" className="flex-none px-3">
            Application form
          </TabsTrigger>
          {capacity !== undefined ? (
            <TabsTrigger value="capacity" className="flex-none px-3">
              Capacity
            </TabsTrigger>
          ) : null}
        </TabsList>
      </div>

      <TabsContent value="description">{description}</TabsContent>
      <TabsContent value="application-form">{applicationForm}</TabsContent>
      {capacity !== undefined ? <TabsContent value="capacity">{capacity}</TabsContent> : null}
    </Tabs>
  );
}
