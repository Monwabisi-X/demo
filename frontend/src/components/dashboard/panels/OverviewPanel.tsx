import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useNetWorth, usePolicies, useClaims } from '@/hooks/useClientData';
import { Metric, Card, CardHeader, Loading, ErrorState } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { toApiError } from '@/api/client';

const MAROON = '#6E1423';
const INK = '#1A1613';

export function OverviewPanel({ clientId }: { clientId: string }) {
  const netWorth = useNetWorth(clientId);
  const policies = usePolicies(clientId);
  const claims = useClaims(clientId);

  if (netWorth.isLoading) return <Loading label="Loading your financial overview…" />;
  if (netWorth.isError) return <ErrorState message={toApiError(netWorth.error).message} />;

  const nw = netWorth.data;
  const assets = Number(nw?.total_assets || 0);
  const liabilities = Number(nw?.total_liabilities || 0);
  const activePolicies = (policies.data || []).filter((p) => p.status === 'active').length;
  const openClaims = (claims.data || []).filter((c) => !c.closed_at).length;

  const chartData = [
    { name: 'Assets', value: assets },
    { name: 'Liabilities', value: liabilities },
    { name: 'Net worth', value: Number(nw?.net_worth || 0) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Your position</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Overview</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Net worth" value={formatCurrency(nw?.net_worth)} accent hint="Assets less liabilities" />
        <Metric label="Total assets" value={formatCurrency(nw?.total_assets)} />
        <Metric label="Total liabilities" value={formatCurrency(nw?.total_liabilities)} />
        <Metric label="Active policies" value={activePolicies} hint={`${openClaims} open claim(s)`} />
      </div>

      <Card>
        <CardHeader eyebrow="Balance sheet" title="Assets vs liabilities" subtitle="Current snapshot in ZAR" />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <XAxis dataKey="name" tick={{ fill: INK, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#8A817C', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v))}
                contentStyle={{ borderRadius: 12, border: '1px solid #E8DFD1', background: '#FDFCFA' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.name === 'Net worth' ? MAROON : INK} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
