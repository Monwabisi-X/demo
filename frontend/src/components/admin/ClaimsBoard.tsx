import { Card, Badge, statusTone } from '@/components/ui';

/**
 * Claims Kanban board. The current backend exposes claims per-client (GET /claims/:clientId)
 * rather than a tenant-wide list, so this board renders the standard motor-claim workflow
 * columns as a presentation scaffold. Wire to a tenant claims endpoint when available.
 */
const COLUMNS = [
  { key: 'REPORTED', label: 'Reported' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'ASSESSMENT', label: 'Assessment' },
  { key: 'REPAIR_IN_PROGRESS', label: 'Repair' },
  { key: 'CLOSED', label: 'Closed' },
];

export function ClaimsBoard() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Operations</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Claims Board</h1>
        <p className="mt-1 text-sm text-ink-faint">
          Track motor & general claims through their lifecycle.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-xl border border-cream-300 bg-cream-100 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{col.label}</span>
              <Badge tone={statusTone(col.key)}>0</Badge>
            </div>
            <Card className="border-dashed bg-cream-50 py-8 text-center text-xs text-ink-faint">
              No claims in this stage
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
