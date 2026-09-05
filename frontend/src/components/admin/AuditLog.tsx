import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Card, Loading, EmptyState, ErrorState, Badge } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { toApiError } from '@/api/client';

interface AuditEvent {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  actor_role_code?: string | null;
  occurred_at: string;
}

export function AuditLog() {
  const audit = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: () => api.get<AuditEvent[]>('/audit', { limit: 100 }),
  });

  if (audit.isLoading) return <Loading label="Loading audit trail…" />;
  if (audit.isError) return <ErrorState message={toApiError(audit.error).message} />;

  const rows = audit.data || [];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">POPIA</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Immutable Audit Log</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Every change is recorded and cannot be altered or deleted.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No audit events yet" />
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-300 text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-6 py-3 font-medium">When</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Entity</th>
                  <th className="px-6 py-3 font-medium">Actor role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-cream-100">
                    <td className="px-6 py-3 text-ink-soft">{formatDate(e.occurred_at)}</td>
                    <td className="px-6 py-3 font-medium text-ink">{e.action}</td>
                    <td className="px-6 py-3 text-ink-soft">
                      {e.entity_type}
                      {e.entity_id ? ` · ${e.entity_id.slice(0, 8)}` : ''}
                    </td>
                    <td className="px-6 py-3">
                      {e.actor_role_code ? <Badge tone="neutral">{e.actor_role_code}</Badge> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
