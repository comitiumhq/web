import { MAX_POSTING_SKILLS, type SkillRequirement } from '@comitium/schemas/skills';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SkillsEditor } from './skills-editor';

const REACT: SkillRequirement = {
  skillId: '0199badd-0000-7000-8000-000000000001',
  label: 'React',
  required: true,
  status: 'active',
};

const TYPESCRIPT: SkillRequirement = {
  skillId: '0199badd-0000-7000-8000-000000000002',
  label: 'TypeScript',
  required: true,
  status: 'active',
};

vi.mock('@/lib/api/skills', () => ({
  searchSkills: async (query: string) => ({
    data: query.toLowerCase().startsWith('java')
      ? [
          {
            id: '0199badd-0000-7000-8000-000000000004',
            label: 'Java',
            categories: [{ code: 'technology', label: 'Technology' }],
          },
          {
            id: '0199badd-0000-7000-8000-000000000005',
            label: 'JavaScript',
            categories: [{ code: 'technology', label: 'Technology' }],
          },
        ]
      : [
          {
            id: '0199badd-0000-7000-8000-000000000003',
            label: 'Angular',
            categories: [{ code: 'technology', label: 'Technology' }],
          },
        ],
    nextPage: null,
  }),
}));

function TestEditor({ initialSkills = [REACT, TYPESCRIPT] }: { initialSkills?: SkillRequirement[] }) {
  const [skills, setSkills] = useState(initialSkills);
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  return (
    <QueryClientProvider client={client}>
      <SkillsEditor value={skills} onChange={setSkills} />
      <output aria-label="Skill order">{skills.map((skill) => skill.label).join(', ')}</output>
    </QueryClientProvider>
  );
}

describe('SkillsEditor', () => {
  it('adds and removes a searched skill', async () => {
    const screen = await render(<TestEditor initialSkills={[]} />);

    await screen.getByRole('combobox', { name: 'Search and add skills' }).fill('Angular');
    await screen.getByRole('option', { name: /Angular/ }).click();

    await expect.element(screen.getByLabelText('Skill order')).toHaveTextContent('Angular');
    await screen.getByRole('button', { name: 'Remove Angular' }).click();

    await expect.element(screen.getByLabelText('Skill order')).toBeEmptyDOMElement();
  });

  it('shows JavaScript next to Java and keeps it available after Java is selected', async () => {
    const screen = await render(<TestEditor initialSkills={[]} />);
    const input = screen.getByRole('combobox', { name: 'Search and add skills' });

    await input.fill('java');
    await expect.element(screen.getByRole('option', { name: /JavaScript/ })).toBeVisible();
    await screen.getByRole('option').first().click();

    await expect.element(screen.getByLabelText('Skill order')).toHaveTextContent('Java');

    await input.fill('javas');
    await expect.element(screen.getByRole('option', { name: /JavaScript/ })).toBeVisible();
  });

  it('stops adding skills at the limit and allows another after removal', async () => {
    const initialSkills = [
      REACT,
      ...Array.from({ length: MAX_POSTING_SKILLS - 1 }, (_, index) => ({
        ...TYPESCRIPT,
        skillId: `skill-${index}`,
      })),
    ];
    const screen = await render(<TestEditor initialSkills={initialSkills} />);
    const input = screen.getByRole('combobox', { name: 'Search and add skills' });

    await expect.element(input).toBeDisabled();

    await screen.getByRole('button', { name: 'Remove React' }).click();

    await expect.element(input).toBeEnabled();
  });

  it('marks a single skill as preferred', async () => {
    const screen = await render(<TestEditor initialSkills={[REACT]} />);
    const importance = screen.getByRole('group', { name: 'Importance for React' });

    await expect.element(importance.getByRole('radio', { name: 'Required' })).toBeChecked();
    await importance.getByRole('radio', { name: 'Preferred' }).click();

    await expect.element(importance.getByRole('radio', { name: 'Preferred' })).toBeChecked();
  });

  it('reorders selected skills with the keyboard drag handle', async () => {
    const screen = await render(<TestEditor />);

    const handle = screen.getByRole('button', { name: 'Reorder React' });
    handle.element().focus();
    await userEvent.keyboard('{Space}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Space}');

    await expect.element(screen.getByLabelText('Skill order')).toHaveTextContent('TypeScript, React');
  });

  it('reorders selected skills by dragging the handle', async () => {
    const screen = await render(<TestEditor />);

    await userEvent.dragAndDrop(
      screen.getByRole('button', { name: 'Reorder React' }),
      screen.getByRole('button', { name: 'Reorder TypeScript' }),
    );

    await expect.element(screen.getByLabelText('Skill order')).toHaveTextContent('TypeScript, React');
  });
});
