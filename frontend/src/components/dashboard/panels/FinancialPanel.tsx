import { useAssets, useLiabilities } from '@/hooks/useClientData';
import { Card, CardHeader, Loading, EmptyState, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/format';

function num(v: unknown): number {
  return Number((v as string | number) ?? 0);
}

export function FinancialPanel({ clientId }: { clientId: string }) {
  const assets = useAssets(clientId);
  const liabilities = useLiabilities(clientId);

  if (assets.isLoading || liabilities.isLoading) return <Loading label="Loading financial position…" />;

  const assetRows = assets.data || [];
  const liabilityRows = liabilities.data || [];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Balance sheet detail</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Financial Position</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Assets"
            eyebrow="What you own"
            action={<Badge tone="ink">{assetRows.length}</Badge>}
          />
          {assetRows.length === 0 ? (
            <EmptyState title="No assets recorded" description="Assets added by your adviser appear here." />
          ) : (
            <ul className="divide-y divide-cream-300">
              {assetRows.map((a, i) => (
                <li key={(a.id as string) || i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-ink">{(a.description as string) || (a.category as string)}</p>
                    <p className="text-xs text-ink-faint">{a.category as string}</p>
                  </div>
                  <span className="font-serif font-semibold text-ink">{formatCurrency(num(a.current_value))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Liabilities"
            eyebrow="What you owe"
            action={<Badge tone="maroon">{liabilityRows.length}</Badge>}
          />
          {liabilityRows.length === 0 ? (
            <EmptyState title="No liabilities recorded" description="Debts added by your adviser appear here." />
          ) : (
            <ul className="divide-y divide-cream-300">
              {liabilityRows.map((l, i) => (
                <li key={(l.id as string) || i} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-ink">{(l.creditor_name as string) || (l.category as string)}</p>
                    <p className="text-xs text-ink-faint">{l.category as string}</p>
                  </div>
                  <span className="font-serif font-semibold text-maroon">{formatCurrency(num(l.current_balance))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
