import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { KoisaChatResponse } from '@/api/types';
import { DASHBOARD_TABS } from '@/components/dashboard/DashboardShell';

const VALID_TABS = new Set(DASHBOARD_TABS.map((tab) => tab.id));

/** Execute only the backend's allow-listed navigation actions. */
export function useKoisaActions() {
  const navigate = useNavigate();

  const handleResponse = useCallback(
    (response: KoisaChatResponse) => {
      const action = response.actions.find(
        (candidate) => candidate.type === 'navigate' && VALID_TABS.has(candidate.tab)
      );
      if (action) {
        navigate(`/dashboard?tab=${encodeURIComponent(action.tab)}`);
        return { navigatedTo: action.tab };
      }
      return { navigatedTo: null };
    },
    [navigate]
  );

  return { handleResponse };
}
