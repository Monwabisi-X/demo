import { useState } from 'react';
import type { StagingSubmission } from '@/api/types';
import { useStagingActions } from '@/hooks/useStaging';
import { toApiError } from '@/api/client';
import { Button, Select, Textarea, Badge, statusTone } from '@/components/ui';
import { formatDate } from '@/lib/format';

const PROVIDERS = [
  { value: 'SANTAM', label: 'Santam' },
  { value: 'SANLAM', label: 'Sanlam' },
  { value: 'DISCOVERY', label: 'Discovery' },
  { value: 'LIBERTY', label: 'Liberty' },
  { value: 'OLD_MUTUAL', label: 'Old Mutual' },
];

/**
 * Split-screen QA workspace. Left: the raw client submission snapshot. Right: adviser review,
 * target-provider selection, notes, and approve/reject. Approving enriches adviser_edits and
 * queues dispatch to the provider (via the backend workflow → Bull queue).
 */
export function StagingStudio({
  submission,
  onDone,
}: {
  submission: StagingSubmission;
  onDone?: () => void;
}) {
  const { approve, reject } = useStagingActions();
  const [provider, setProvider] = useState('SANTAM');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    try {
      await approve.mutateAsync({
        id: submission.id,
        targetProvider: provider,
        adviserEdits: { adviser_notes: notes },
      });
      onDone?.();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  async function handleReject() {
    setError(null);
    try {
      await reject.mutateAsync({ id: submission.id, reason: notes || 'Rejected by adviser' });
      onDone?.();
    } catch (err) {
      setError(toApiError(err).message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: raw submission snapshot */}
      <div className="flex flex-col rounded-xl border border-cream-300 bg-cream-50 shadow-card">
        <div className="flex items-center justify-between border-b border-cream-300 px-5 py-4">
          <div>
            <p className="eyebrow">Raw client submission</p>
            <h3 className="mt-0.5 text-base font-semibold text-ink">{submission.submission_type}</h3>
          </div>
          <Badge tone={statusTone(submission.status)}>{submission.status}</Badge>
        </div>
        <div className="p-5">
          <p className="mb-2 text-xs text-ink-faint">
            Submitted {formatDate(submission.created_at)} · id {submission.id.slice(0, 8)}
          </p>
          <pre className="max-h-[52vh] overflow-auto rounded-lg border border-cream-300 bg-ink p-4 text-xs leading-relaxed text-cream-100">
            {JSON.stringify(submission.client_snapshot ?? {}, null, 2)}
          </pre>
        </div>
      </div>

      {/* Right: adviser QA control */}
      <div className="flex flex-col justify-between rounded-xl border border-cream-300 bg-cream-50 p-5 shadow-card">
        <div className="space-y-4">
          <div>
            <p className="eyebrow">Adviser control & verification</p>
            <h3 className="mt-0.5 text-base font-semibold text-ink">Review & dispatch</h3>
          </div>

          <Select
            label="Target provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            options={PROVIDERS}
          />

          <Textarea
            label="Adviser review notes"
            placeholder="Verification notes, adjustments, and rationale…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[160px]"
          />

          {submission.adviser_edits && Object.keys(submission.adviser_edits).length > 0 && (
            <div className="rounded-lg bg-cream-200 p-3 text-xs text-ink-soft">
              <p className="mb-1 font-medium text-ink">Existing adviser edits</p>
              <pre className="overflow-auto">{JSON.stringify(submission.adviser_edits, null, 2)}</pre>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-maroon/20 bg-maroon-tint px-3 py-2 text-sm text-maroon">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            className="flex-1"
            size="lg"
            loading={approve.isPending}
            onClick={handleApprove}
          >
            Approve &amp; Dispatch
          </Button>
          <Button
            variant="danger"
            size="lg"
            loading={reject.isPending}
            onClick={handleReject}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
