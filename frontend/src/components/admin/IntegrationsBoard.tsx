import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin.api';
import { Card, CardHeader, Loading, EmptyState, Badge, Button, statusTone } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { toApiError } from '@/api/client';

/**
 * Operations view of the "straight-through to provider" spine: every automated hand-off to a
 * product provider (claims, applications, identity checks) is logged here with its status and
 * idempotent provider reference. Also lets staff trigger the reminder scheduler.
 */
export function IntegrationsBoard() {
  const qc = useQueryClient();
  const submissions = useQuery({
    queryKey: ['admin', 'integrationSubmissions'],
    queryFn: () => adminApi.integrationSubmissions(),
  });
  const reminders = useQuery({
    queryKey: ['admin', 'reminders'],
    queryFn: () => adminApi.reminders(),
  });

  const runReminders = useMutation({
    mutationFn: () => adminApi.runReminders(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reminders'] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Automation</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Provider integrations &amp; reminders</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Straight-through submissions to providers (Santam, Sanlam, Discovery, Liberty, Old Mutual,
          Smile ID) with idempotent references, plus the recurring reminder schedule.
        </p>
      </div>

      {/* Integration submissions */}
      <section className="space-y-3">
        {submissions.isLoading ? (
          <Loading label="Loading provider submissions…" />
        ) : submissions.isError ? (
          <EmptyState title="Could not load submissions" description={toApiError(submissions.error).message} />
        ) : (submissions.data || []).length === 0 ? (
          <EmptyState title="No provider submissions yet" description="Automated hand-offs will appear here as they happen." />
        ) : (
          <Card className="p-0">
            <CardHeader eyebrow="Straight-through" title="Provider submissions" subtitle={`${submissions.data!.length} record(s)`} />
            <ul className="divide-y divide-cream-300">
              {submissions.data!.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      <span className="uppercase">{s.provider}</span> · {s.submission_type}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-faint">
                      {s.provider_reference || 'no reference'} · {s.channel} · {formatDate(s.created_at)}
                    </p>
                  </div>
                  <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* Reminders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink">Reminder schedule</h2>
          <Button size="sm" variant="outline" loading={runReminders.isPending} onClick={() => runReminders.mutate()}>
            Run due reminders now
          </Button>
        </div>
        {reminders.isLoading ? (
          <Loading label="Loading reminders…" />
        ) : (reminders.data || []).length === 0 ? (
          <EmptyState title="No reminder rules" description="Recurring reminders will appear here." />
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-cream-300">
              {reminders.data!.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="font-medium text-ink">{r.title}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      every {r.cadence_interval} · to {r.audience} · next {formatDate(r.next_run_at)}
                    </p>
                  </div>
                  <Badge tone={r.active ? 'success' : 'neutral'}>{r.active ? 'active' : 'paused'}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
