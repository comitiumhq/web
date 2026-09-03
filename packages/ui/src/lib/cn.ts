import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'heading-48',
            'heading-40',
            'heading-32',
            'heading-26',
            'heading-24',
            'heading-20',
            'heading-16',
            'heading-14',
            'button-16',
            'button-14',
            'button-12',
            'label-20',
            'label-18',
            'label-16',
            'label-14',
            'label-13',
            'label-12',
            'label-14-mono',
            'label-13-mono',
            'label-12-mono',
            'copy-24',
            'copy-20',
            'copy-18',
            'copy-16',
            'copy-14',
            'copy-13',
            'copy-13-mono',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
