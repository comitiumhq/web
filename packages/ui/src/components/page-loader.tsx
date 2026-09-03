import { Spinner } from './spinner';

export function PageLoader() {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] items-center justify-center">
      <Spinner className="mb-28 size-10 text-primary" />
    </div>
  );
}
