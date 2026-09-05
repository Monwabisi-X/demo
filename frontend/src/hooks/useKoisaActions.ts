import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { KoisaChatResponse } from '@/api/types';
import { DASHBOARD_TABS } from '@/components/dashboard/DashboardShell';

const VALID_TABS = new Set(DASHBOARD_TABS.map((t) => t.id));

/**
 * Executes UI action callbacks returned by Koisa (Bedrock tool calls). The only UI-affecting
 * tool is navigate_to_tab — Koisa never mutates data from the client. We map the requested
 * tab onto the dashboard route's ?tab= param so the existing DashboardPage renders it.
 *
 * The backend response may express the navigation either as a structured `tool_call`
 * ({ name: 'navigate_to_tab', args: { tab | target_tab } }) or inside `toolResults`; both are
 * handled defensively.
 */
export function useKoisaActions() {
  const navigate = useNavigate();

  const handleResponse = useCallback(
    (res: KoisaChatResponse) => {
      const tab = extractNavTab(res);
      if (tab && VALID_TABS.has(tab)) {
        navigate(`/dashboard?tab=${encodeURIComponent(tab)}`);
        return { navigatedTo: tab };
      }
      return { navigatedTo: null };
    },
    [navigate]
  );

  return { handleResponse };
}

/** Pull a navigate_to_tab target out of whatever shape the backend returned. */
function extractNavTab(res: KoisaChatResponse): string | null {
  // 1) Structured tool_call
  if (res.tool_call?.name === 'navigate_to_tab') {
    const t = res.tool_call.args?.tab || res.tool_call.args?.target_tab;
    if (t) return normalizeTab(t);
  }
  // 2) toolResults array (from the guardrailed dispatch)
  for (const r of res.toolResults ?? []) {
    if (r.tool === 'navigate_to_tab') {
      const result = r.result as { tab?: string; action?: string } | undefined;
      if (result?.tab) return normalizeTab(result.tab);
    }
  }
  return null;
}

/** Accept route-ish values ("/claims", "claims") and map to a dashboard tab id. */
function normalizeTab(raw: string): string {
  return raw.replace(/^\//, '').trim();
}
