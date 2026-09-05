import { useState } from 'react';
import { useDocuments } from '@/hooks/useClientData';
import { documentsApi } from '@/api/documents.api';
import { Card, CardHeader, Loading, EmptyState, Badge, Button, statusTone } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { toApiError } from '@/api/client';

export function DocumentsPanel({ clientId }: { clientId: string }) {
  const documents = useDocuments(clientId);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(documentId: string) {
    setError(null);
    setDownloading(documentId);
    try {
      const { url } = await documentsApi.downloadUrl(documentId);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setDownloading(null);
    }
  }

  if (documents.isLoading) return <Loading label="Loading your documents…" />;
  const rows = documents.data || [];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Secure storage</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Documents</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Consent forms, T&amp;Cs, FICA documents and policy schedules — access is logged.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-maroon/20 bg-maroon-tint px-3 py-2 text-sm text-maroon">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No documents" description="Uploaded documents will be listed here." />
      ) : (
        <Card className="p-0">
          <CardHeader eyebrow="Files" title="All documents" subtitle={`${rows.length} file(s)`} />
          <ul className="divide-y divide-cream-300">
            {rows.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{d.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                    <span>{d.DocumentType?.name || 'Document'}</span>
                    <span>·</span>
                    <span>{formatDate(d.created_at)}</span>
                    {d.DocumentType?.is_consent_artifact && <Badge tone="maroon">Consent</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone(d.review_status)}>{d.review_status}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={downloading === d.id}
                    onClick={() => handleDownload(d.id)}
                  >
                    Download
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
