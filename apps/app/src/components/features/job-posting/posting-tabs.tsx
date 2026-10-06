import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import type { ReactNode } from 'react';

interface PostingTabsProps {
  description: ReactNode;
  skills: ReactNode;
  applicationForm: ReactNode;
  capacity?: ReactNode;
  value?: PostingTab;
  onValueChange?: (value: PostingTab) => void;
}

export type PostingTab = 'description' | 'skills' | 'application-form' | 'capacity';

const SHOW_SKILLS_TAB = false;

export function PostingTabs({
  description,
  skills,
  applicationForm,
  capacity,
  value,
  onValueChange,
}: PostingTabsProps) {
  return (
    <Tabs
      defaultValue="description"
      value={value}
      onValueChange={(nextValue) => onValueChange?.(nextValue as PostingTab)}
      className="min-w-0 gap-6"
    >
      <div className="overflow-x-auto pb-1">
        <TabsList variant="line" className="min-w-max justify-start">
          <TabsTrigger value="description" className="flex-none">
            Description
          </TabsTrigger>
          {SHOW_SKILLS_TAB && (
            <TabsTrigger value="skills" className="flex-none">
              Skills
            </TabsTrigger>
          )}
          <TabsTrigger value="application-form" className="flex-none">
            Application form
          </TabsTrigger>
          {capacity !== undefined ? (
            <TabsTrigger value="capacity" className="flex-none">
              Capacity
            </TabsTrigger>
          ) : null}
        </TabsList>
      </div>

      <TabsContent value="description">{description}</TabsContent>
      {SHOW_SKILLS_TAB && <TabsContent value="skills">{skills}</TabsContent>}
      <TabsContent value="application-form">{applicationForm}</TabsContent>
      {capacity !== undefined ? <TabsContent value="capacity">{capacity}</TabsContent> : null}
    </Tabs>
  );
}
