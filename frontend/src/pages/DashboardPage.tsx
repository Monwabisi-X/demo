import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClient } from '@/hooks/useClientData';
import { DashboardShell, DASHBOARD_TABS } from '@/components/dashboard/DashboardShell';
import { OverviewPanel } from '@/components/dashboard/panels/OverviewPanel';
import { FinancialPanel } from '@/components/dashboard/panels/FinancialPanel';
import { PoliciesPanel } from '@/components/dashboard/panels/PoliciesPanel';
import { ClaimsPanel } from '@/components/dashboard/panels/ClaimsPanel';
import { DocumentsPanel } from '@/components/dashboard/panels/DocumentsPanel';
import { GoalsPanel } from '@/components/dashboard/panels/GoalsPanel';
import { LearningPanel } from '@/components/dashboard/panels/LearningPanel';
import { ProfilePanel } from '@/components/dashboard/panels/ProfilePanel';
import { EmptyState } from '@/components/ui';

const VALID = new Set(DASHBOARD_TABS.map((t) => t.id));

export default function DashboardPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const rawTab = params.get('tab') || 'overview';
  const active = VALID.has(rawTab) ? rawTab : 'overview';

  // A client user has client_id on their principal; advisers can pass ?client=<id>.
  const clientId = params.get('client') || user?.client_id || undefined;
  const client = useClient(clientId);

  function navigate(tab: string) {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    setParams(next, { replace: false });
  }

  return (
    <DashboardShell active={active} onNavigate={navigate} ficaStatus={client.data?.fica_status}>
      {/* The Information & Learning tab is tenant-scoped content and needs no linked client. */}
      {active === 'learning' ? (
        <LearningPanel />
      ) : !clientId ? (
        <EmptyState
          title="No client linked to this account"
          description="Client-scoped data requires a linked client record. Advisers can open a client via ?client=<id>."
        />
      ) : active === 'overview' ? (
        <OverviewPanel clientId={clientId} />
      ) : active === 'financial_position' ? (
        <FinancialPanel clientId={clientId} />
      ) : active === 'policies' ? (
        <PoliciesPanel clientId={clientId} />
      ) : active === 'claims' ? (
        <ClaimsPanel clientId={clientId} />
      ) : active === 'documents' ? (
        <DocumentsPanel clientId={clientId} />
      ) : active === 'goals' ? (
        <GoalsPanel clientId={clientId} />
      ) : active === 'profile' ? (
        <ProfilePanel clientId={clientId} />
      ) : (
        <OverviewPanel clientId={clientId} />
      )}
    </DashboardShell>
  );
}
