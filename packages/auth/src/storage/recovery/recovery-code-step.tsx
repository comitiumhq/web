import { Button } from '@comitium/ui/button';
import { Checkbox } from '@comitium/ui/checkbox';
import { triggerFileDownload } from '@comitium/ui/download';
import { Label } from '@comitium/ui/label';
import { Spinner } from '@comitium/ui/spinner';
import { CheckIcon, DownloadIcon, FileTextIcon } from 'lucide-react';
import { useCallback, useId, useState } from 'react';
import { AuthFormError } from '../../auth-form-error';
import { StorageFormHeader } from '../storage-form-header';

interface RecoveryCodeStepProps {
  code: string;
  saving?: boolean;
  replacing?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  dialog?: boolean;
}

export function RecoveryCodeStep({
  code,
  saving = false,
  replacing = false,
  onConfirm,
  onCancel,
  dialog = false,
}: RecoveryCodeStepProps) {
  const id = useId();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setError(null);
      setShowCode(false);
    } catch {
      setShowCode(true);
      setError('Could not copy. Select the code to copy it manually.');
    }
  }, [code]);

  const download = useCallback(async () => {
    setDownloading(true);
    setDownloadStarted(false);
    setError(null);

    try {
      const { createRecoveryKit } = await import('./recovery-kit-pdf');
      const pdf = await createRecoveryKit(code);

      triggerFileDownload(pdf, 'comitium-recovery-kit.pdf', 'application/pdf');
      setDownloadStarted(true);
    } catch {
      setError('Could not download the PDF. Copy the code instead.');
    } finally {
      setDownloading(false);
    }
  }, [code]);

  const changeSaved = useCallback((checked: boolean | 'indeterminate') => setSaved(checked === true), []);

  const busy = downloading || saving;
  let downloadStatus = 'Download PDF';

  if (downloading) {
    downloadStatus = 'Preparing PDF…';
  } else if (downloadStarted) {
    downloadStatus = 'Download started';
  }

  return (
    <section aria-label="Save your recovery kit" className="grid gap-6">
      <StorageFormHeader
        title="Save your recovery kit"
        description={
          replacing
            ? 'Saving this code will replace your current recovery code.'
            : 'Use it to recover your encrypted data if you forget your password.'
        }
        dialog={dialog}
        pending={busy}
        onBack={onCancel}
      />
      <div className="grid gap-2">
        <Button
          variant="outline"
          className="h-auto w-full justify-start gap-4 rounded-3xl p-5 text-left"
          aria-label="Download recovery kit"
          disabled={busy}
          onClick={download}
        >
          <FileTextIcon className="size-8 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block text-label-14">Comitium recovery kit</span>
            <span className="mt-1 block text-copy-12 text-muted-foreground" aria-live="polite">
              {downloadStatus}
            </span>
          </span>
          {downloading ? <Spinner /> : <DownloadIcon className="size-5" />}
        </Button>
        <Button variant="link" className="mx-auto h-8 text-copy-13" disabled={busy} onClick={copy} aria-live="polite">
          {copied ? <CheckIcon /> : null}
          {copied ? 'Copied' : 'Copy recovery code'}
        </Button>
        {showCode ? (
          <code className="block break-all rounded-2xl bg-muted px-4 py-3 font-mono text-copy-13 select-all">
            {code}
          </code>
        ) : null}
        <AuthFormError message={error} />
      </div>
      <div className="flex items-center gap-3">
        <Checkbox
          className="border-muted-foreground"
          id={id}
          checked={saved}
          disabled={busy}
          onCheckedChange={changeSaved}
        />
        <Label htmlFor={id} className="font-normal">
          I saved my recovery code
        </Label>
      </div>
      <Button size="lg" disabled={!saved || busy} onClick={onConfirm}>
        {saving ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
        {saving ? 'Saving…' : 'Continue'}
      </Button>
    </section>
  );
}
