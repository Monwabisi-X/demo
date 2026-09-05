import { useAuth } from '@/hooks/useAuth';
import { useClient } from '@/hooks/useClientData';
import { Card, CardHeader, Badge, statusTone, Loading } from '@/components/ui';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-cream-300 py-3 last:border-0">
      <span className="text-sm text-ink-faint">{label}</span>
      <span className="text-sm font-medium text-ink">{value ?? '—'}</span>
    </div>
  );
}

export function ProfilePanel({ clientId }: { clientId?: string }) {
  const { user, roles } = useAuth();
  const client = useClient(clientId);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Your details</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Profile</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" eyebrow="Sign-in" />
          <Row label="Name" value={user?.display_name} />
          <Row label="Email" value={user?.email} />
          <Row label="Roles" value={<span className="flex gap-1">{roles.map((r) => <Badge key={r} tone="neutral">{r}</Badge>)}</span>} />
          <Row label="MFA" value={user?.mfa_enabled ? 'Enabled' : 'Not enabled'} />
        </Card>

        <Card>
          <CardHeader title="Client record" eyebrow="Advisory profile" />
          {client.isLoading ? (
            <Loading label="Loading client record…" />
          ) : client.data ? (
            <>
              <Row label="Client" value={client.data.first_name ? `${client.data.first_name} ${client.data.surname ?? ''}` : client.data.legal_entity_name} />
              <Row label="Type" value={<span className="capitalize">{client.data.client_type}</span>} />
              <Row label="FICA status" value={<Badge tone={statusTone(client.data.fica_status)}>{client.data.fica_status}</Badge>} />
              <Row label="Status" value={<span className="capitalize">{client.data.status}</span>} />
            </>
          ) : (
            <p className="py-3 text-sm text-ink-faint">
              No linked client record. Sensitive identifiers (ID, tax, banking) are never
              displayed here — they are encrypted at rest.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
