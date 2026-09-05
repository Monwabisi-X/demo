import { useSearchParams } from 'react-router-dom';
import { AdminShell, ADMIN_SECTIONS } from '@/components/admin/AdminShell';
import { StagingHub } from '@/components/admin/StagingHub';
import { ClaimsBoard } from '@/components/admin/ClaimsBoard';
import { AuditLog } from '@/components/admin/AuditLog';

const VALID = new Set(ADMIN_SECTIONS.map((s) => s.id));

export default function AdminPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('section') || 'staging';
  const active = VALID.has(raw) ? raw : 'staging';

  function navigate(section: string) {
    const next = new URLSearchParams(params);
    next.set('section', section);
    setParams(next, { replace: false });
  }

  return (
    <AdminShell active={active} onNavigate={navigate}>
      {active === 'staging' && <StagingHub />}
      {active === 'claims' && <ClaimsBoard />}
      {active === 'audit' && <AuditLog />}
    </AdminShell>
  );
}
