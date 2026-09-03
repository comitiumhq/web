import { ArrowSquareOutIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';

import { Alert, AlertDescription } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Skeleton } from '@comitium/ui/skeleton';
import { EncryptedPlaceholder } from '@/components/features/encryption/encrypted-placeholder';
import { useEncryptionUnlocked } from '@/hooks/use-encryption-unlocked';
import { cn, isClient } from '@/lib/utils';

if (isClient) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
}

interface ResumePreviewProps {
  className?: string;
  error: string | null;
  hasResume: boolean;
  isLoading: boolean;
  onDownload: () => void;
  orgId: string;
  pdfData: Uint8Array | null;
  showDownload?: boolean;
}

export function ResumePreview({
  className,
  error,
  hasResume,
  isLoading,
  onDownload,
  orgId,
  pdfData,
  showDownload = true,
}: ResumePreviewProps) {
  const { isUnlocked } = useEncryptionUnlocked(orgId);
  const showLockedPlaceholder = !pdfData && !isLoading && !error && !isUnlocked;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {!hasResume && <p className="text-copy-14 text-muted-foreground">No resume uploaded.</p>}

      {hasResume && isLoading && !pdfData && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-40" />
          <ResumePageSkeleton />
        </div>
      )}

      {hasResume && error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasResume && showLockedPlaceholder && <EncryptedPlaceholder orgId={orgId} variant="block" lines={6} />}

      {hasResume && pdfData && (
        <ResumePdfViewer pdfData={pdfData} onDownload={onDownload} showDownload={showDownload} />
      )}
    </div>
  );
}

function ResumePdfViewer({
  pdfData,
  onDownload,
  showDownload,
}: {
  pdfData: Uint8Array;
  onDownload: () => void;
  showDownload: boolean;
}) {
  const [numPages, setNumPages] = useState(0);
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);
  const [pageWidth, setPageWidth] = useState(0);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const file = useMemo(() => {
    const buffer = new ArrayBuffer(pdfData.byteLength);
    new Uint8Array(buffer).set(pdfData);

    return { data: buffer };
  }, [pdfData]);

  useEffect(() => {
    setNumPages(0);
    setIsDocumentLoading(true);

    const url = URL.createObjectURL(new Blob([file.data], { type: 'application/pdf' }));
    setPdfUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const containerRef = useCallback((element: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setPageWidth(entry.contentRect.width);
    });

    observer.observe(element);
    observerRef.current = observer;
  }, []);

  const handleDocumentLoadSuccess = useCallback(({ numPages: loadedPages }: { numPages: number }) => {
    setNumPages(loadedPages);
    setIsDocumentLoading(false);
  }, []);

  const handleDocumentLoadError = useCallback(() => {
    setIsDocumentLoading(false);
  }, []);

  return (
    <>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <p className="text-copy-12 text-muted-foreground">
          {numPages > 0 && `${numPages} ${numPages === 1 ? 'page' : 'pages'}`}
        </p>
        <div className="flex items-center gap-1">
          {pdfUrl ? (
            <Button variant="ghost" size="sm" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ArrowSquareOutIcon data-icon="inline-start" />
                Open in new tab
              </a>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" disabled>
              <ArrowSquareOutIcon data-icon="inline-start" />
              Open in new tab
            </Button>
          )}

          {showDownload && (
            <Button type="button" variant="ghost" size="sm" onClick={onDownload}>
              <DownloadSimpleIcon data-icon="inline-start" />
              Download
            </Button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex flex-col items-center gap-2">
        <Document
          className="w-full"
          file={file}
          onLoadSuccess={handleDocumentLoadSuccess}
          onLoadError={handleDocumentLoadError}
          loading={<ResumePageSkeleton />}
          error={<div className="py-8 text-center text-copy-14 text-destructive">Failed to load PDF.</div>}
        >
          {!isDocumentLoading && pageWidth > 0 && <ResumePages numPages={numPages} pageWidth={pageWidth} />}
        </Document>
      </div>
    </>
  );
}

function ResumePageSkeleton() {
  return (
    <div className="w-full px-2">
      <output className="sr-only">Loading PDF</output>
      <div className="aspect-[8.5/11] w-full rounded bg-card p-8 shadow-md ring-1 ring-border">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-6 w-1/3" />

          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>

          <Skeleton className="h-5 w-1/4" />

          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResumePages({ numPages, pageWidth }: { numPages: number; pageWidth: number }) {
  const pages = [];

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
    pages.push(
      <Page
        key={pageNumber}
        pageNumber={pageNumber}
        width={Math.max(pageWidth - 16, 1)}
        className="mb-2 rounded shadow-md"
        renderAnnotationLayer={false}
      />,
    );
  }

  return pages;
}
