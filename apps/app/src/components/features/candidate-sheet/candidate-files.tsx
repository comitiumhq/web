import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { DownloadIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useQueryCandidateFiles } from '@/hooks/queries/use-query-candidate-files';
import { useQueryOrgVaultAccess } from '@/hooks/queries/use-query-org-vault-access';
import { useDecryptFileMetadata } from '@/hooks/use-decrypt-file-metadata';
import { useDownloadCandidateFile } from '@/hooks/use-download-candidate-file';

interface CandidateFilesProps {
  orgId: string;
  candidateId: string;
}

export function CandidateFiles({ orgId, candidateId }: CandidateFilesProps) {
  const query = useQueryCandidateFiles(candidateId);
  const { data: access } = useQueryOrgVaultAccess(orgId);

  const inputs = useMemo(
    () => query.data?.files.map((file) => ({ fileId: file.id, kind: file.kind, metadata: file.metadata })) ?? null,
    [query.data],
  );

  const metadata = useDecryptFileMetadata(orgId, inputs, access);
  const { download, downloadingFileId } = useDownloadCandidateFile(orgId, candidateId, access);

  if (query.isPending) {
    return <output className="block px-4 pt-20">Loading files…</output>;
  }

  if (query.isError) {
    return (
      <div className="px-4 pt-20">
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Could not load files · Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-4 pt-20">
      <Card size="sm">
        <CardContent className="divide-y divide-separator">
          {query.data.files.length === 0 && <p className="py-3 text-sm text-muted-foreground">No files.</p>}
          {query.data.files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-3 py-3">
              <span className="truncate text-sm">
                {metadata.data?.[file.id]?.fileName ?? (metadata.isDecrypting ? 'Loading file…' : file.kind)}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Download ${metadata.data?.[file.id]?.fileName ?? file.kind}`}
                disabled={Boolean(downloadingFileId) || !access}
                onClick={() => download(file, metadata.data?.[file.id])}
              >
                <DownloadIcon />
              </Button>
            </div>
          ))}
          {metadata.error && (
            <Button variant="ghost" size="sm" onClick={metadata.retry}>
              Retry file details
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
