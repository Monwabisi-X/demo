import { useClaims } from '@/hooks/useClientData';
import { Card, CardHeader, Loading, EmptyState, Badge, statusTone } from '@/components/ui';
import { formatDate } from '@/lib/format';

export function ClaimsPanel({ clientId }: { clientId: string }) {
  const claims = useClaims(clientId);

  if (claims.isLoading) return <Loading label="Loading your claims…" />;
  const rows = claims.data || [];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Claim tracking</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Claims</h1>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No claims filed" description="Submitted claims and their status will appear here." />
      ) : (
        <Card className="p-0">
          <CardHeader eyebrow="History" title="All claims" subtitle={`${rows.length} claim(s)`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-cream-300 text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-6 py-3 font-medium">Claim</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Reported</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-300">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-cream-100">
                    <td className="px-6 py-3 font-medium text-ink">
                      {c.claim_number_masked || c.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-3 capitalize text-ink-soft">{c.claim_type}</td>
                    <td className="px-6 py-3 text-ink-soft">{formatDate(c.reported_at)}</td>
                    <td className="px-6 py-3">
                      <Badge tone={statusTone(c.status)}>{c.status}</Badge>
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
