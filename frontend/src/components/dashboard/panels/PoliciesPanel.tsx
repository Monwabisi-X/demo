import { usePolicies } from '@/hooks/useClientData';
import { Card, Loading, EmptyState, Badge, statusTone } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';

export function PoliciesPanel({ clientId }: { clientId: string }) {
  const policies = usePolicies(clientId);

  if (policies.isLoading) return <Loading label="Loading your policies…" />;
  const rows = policies.data || [];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Your cover & investments</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Policies</h1>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No policies yet"
          description="Once your adviser captures a policy, it will appear here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <Card key={p.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">{p.provider || 'Provider'}</p>
                  <h3 className="mt-0.5 text-lg font-semibold text-ink">{p.product || 'Policy'}</h3>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {p.policy_number_masked ? `No. ${p.policy_number_masked}` : 'Policy number withheld'}
                  </p>
                </div>
                <Badge tone={statusTone(p.status)}>{p.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-cream-300 pt-4 text-sm">
                <div>
                  <p className="text-xs text-ink-faint">Cover amount</p>
                  <p className="font-serif font-semibold text-ink">{formatCurrency(p.cover_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Premium</p>
                  <p className="font-serif font-semibold text-ink">{formatCurrency(p.premium)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Current value</p>
                  <p className="font-serif font-semibold text-ink">{formatCurrency(p.current_value)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Renewal</p>
                  <p className="font-medium text-ink">{formatDate(p.renewal_date)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
