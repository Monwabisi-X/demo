import { useState } from 'react';
import { usePendingStaging } from '@/hooks/useStaging';
import { StagingStudio } from './StagingStudio';
import { Card, CardHeader, Loading, EmptyState, ErrorState, Badge, statusTone, Button } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { toApiError } from '@/api/client';

export function StagingHub() {
  const pending = usePendingStaging();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (pending.isLoading) return <Loading label="Loading staging queue…" />;
  if (pending.isError) return <ErrorState message={toApiError(pending.error).message} />;

  const rows = pending.data || [];
  const selected = rows.find((r) => r.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Control gate</p>
          <h1 className="mt-1 font-serif text-3xl text-ink">Adviser Staging Studio</h1>
          <p className="mt-1 text-sm text-ink-faint">
            Review raw client submissions, enrich them, and dispatch to a provider.
          </p>
        </div>
        <Badge tone="ink">{rows.length} pending</Badge>
      </div>

      {selected ? (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            ← Back to queue
          </Button>
          <StagingStudio submission={selected} onDone={() => setSelectedId(null)} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Queue is clear"
          description="There are no submissions awaiting review right now."
        />
      ) : (
        <Card className="p-0">
          <CardHeader eyebrow="Queue" title="Pending review" subtitle={`${rows.length} item(s)`} />
          <ul className="divide-y divide-cream-300">
            {rows.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-cream-100">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{s.submission_type}</p>
                  <p className="text-xs text-ink-faint">
                    id {s.id.slice(0, 8)} · submitted {formatDate(s.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                  <Button size="sm" onClick={() => setSelectedId(s.id)}>Review</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
