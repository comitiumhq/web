import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import type { ComponentType } from 'react';

import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from './dropdown-menu';

const themeOptions = [
  { value: 'light', label: 'Light mode', icon: SunIcon },
  { value: 'dark', label: 'Dark mode', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
] as const satisfies readonly { value: string; label: string; icon: ComponentType<{ className?: string }> }[];

export function ThemeMenuSub() {
  const { theme: selectedTheme = 'system', resolvedTheme, setTheme } = useTheme();
  const ThemeIcon = resolvedTheme === 'dark' ? MoonIcon : SunIcon;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="h-10 gap-2 px-3 text-sm">
        <ThemeIcon className="size-4 text-muted-foreground" />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-40">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className="h-10 justify-between px-3 text-sm"
            onSelect={() => setTheme(option.value)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <option.icon className="size-4 text-muted-foreground" />
              <span>{option.label}</span>
            </span>
            {selectedTheme === option.value ? <CheckIcon className="size-4 text-foreground" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
