import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '@/api/goals.api';
import { serviceRequestsApi } from '@/api/serviceRequests.api';
import type { Goal, ServiceRequest } from '@/api/types';
import { Card, CardHeader, Loading, EmptyState, Badge, Button, Select, statusTone } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { toApiError } from '@/api/client';
import { Target } from 'lucide-react';

const REQUEST_TYPES = [
  { value: 'CHANGE_OF_ADDRESS', label: 'Change of address' },
  { value: 'CHANGE_OF_BANK', label: 'Change of bank details' },
  { value: 'REQUEST_POLICY_DOCUMENT', label: 'Request a policy document' },
  { value: 'REQUEST_BORDER_LETTER', label: 'Request a border letter' },
  { value: 'REQUEST_IRP5', label: 'Request an IRP5' },
  { value: 'REQUEST_CONSULTATION', label: 'Request a consultation' },
];

export function GoalsPanel({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const goals = useQuery({
    queryKey: ['goals', clientId],
    queryFn: () => goalsApi.listForClient(clientId),
    enabled: !!clientId,
  });
  const requests = useQuery({
    queryKey: ['serviceRequests', clientId],
    queryFn: () => serviceRequestsApi.listForClient(clientId),
    enabled: !!clientId,
  });

  const [requestType, setRequestType] = useState(REQUEST_TYPES[0].value);
  const [error, setError] = useState<string | null>(null);

  const raise = useMutation({
    mutationFn: () => serviceRequestsApi.create({ clientId, requestType }),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ['serviceRequests', clientId] });
    },
    onError: (err) => setError(toApiError(err).message),
  });

  if (goals.isLoading) return <Loading label="Loading your goals…" />;
  const rows: Goal[] = goals.data || [];
  const reqRows: ServiceRequest[] = requests.data || [];

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Planning</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Goals &amp; requests</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Track progress towards your financial goals, and raise everyday requests — your adviser
          picks these up and keeps you posted.
        </p>
      </div>

      {/* Goals */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-maroon" strokeWidth={1.8} />
          <h2 className="font-serif text-xl text-ink">Your goals</h2>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title="No goals yet"
            description="Your adviser can load individual or shared goals — they'll show here with progress."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((g) => (
              <Card key={g.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{g.category || g.scope}</p>
                    <h3 className="mt-0.5 text-lg font-semibold text-ink">{g.name}</h3>
                    {g.target_date && (
                      <p className="mt-0.5 text-xs text-ink-faint">Target date {formatDate(g.target_date)}</p>
                    )}
                  </div>
                  <Badge tone={statusTone(g.status)}>{g.status}</Badge>
                </div>
                {/* Progress bar */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink-faint">
                      {formatCurrency(g.current_amount)} of {formatCurrency(g.target_amount)}
                    </span>
                    <span className="font-semibold text-maroon">{g.progress_pct}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream-200">
                    <div
                      className="h-full rounded-full bg-maroon transition-all"
                      style={{ width: `${g.progress_pct}%` }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Service requests */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl text-ink">Requests</h2>
        <Card className="flex flex-col gap-4">
          <CardHeader eyebrow="Raise a request" title="Need something done?" subtitle="We'll action it and keep you updated." />
          {error && (
            <div className="rounded-lg border border-maroon/20 bg-maroon-tint px-3 py-2 text-sm text-maroon">{error}</div>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Select
                label="Request type"
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                options={REQUEST_TYPES}
              />
            </div>
            <Button onClick={() => raise.mutate()} loading={raise.isPending}>
              Submit request
            </Button>
          </div>
        </Card>

        {reqRows.length > 0 && (
          <Card className="p-0">
            <CardHeader eyebrow="History" title="Your requests" subtitle={`${reqRows.length} request(s)`} />
            <ul className="divide-y divide-cream-300">
              {reqRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="font-medium text-ink">
                      {REQUEST_TYPES.find((t) => t.value === r.request_type)?.label || r.request_type}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-faint">Raised {formatDate(r.created_at)}</p>
                  </div>
                  <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
