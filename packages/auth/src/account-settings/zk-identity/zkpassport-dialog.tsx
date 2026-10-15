import { Button } from '@comitium/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { Spinner } from '@comitium/ui/spinner';
import { XIcon } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';

import type { ZkPassportFlowProps } from './zkpassport-flow';

const ZkPassportFlow = lazy(() => import('./zkpassport-flow').then((module) => ({ default: module.ZkPassportFlow })));

export function ZkPassportDialog({ onClose, ...flowProps }: ZkPassportFlowProps & { onClose: () => void }) {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-1rem)] w-[380px] max-w-[calc(100%-1rem)] gap-0 overflow-y-auto rounded-[14px] bg-transparent p-0 ring-0 sm:max-w-[380px]"
        onCloseAutoFocus={onClose}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>ZKPassport verification</DialogTitle>
          <DialogDescription>Complete the verification request in the ZKPassport app.</DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button className="absolute top-1.5 left-2 z-10" variant="ghost" size="icon-xs">
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
        <Suspense fallback={<ZkPassportFlowLoading />}>
          <ZkPassportFlow {...flowProps} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

function ZkPassportFlowLoading() {
  return (
    <div className="flex min-h-96 items-center justify-center rounded-[14px] bg-background">
      <Spinner />
    </div>
  );
}
