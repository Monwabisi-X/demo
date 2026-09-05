'use strict';

/**
 * Koisa backend bridge.
 *
 * Responsibilities (all defence-in-depth, independent of the model):
 *   1. Pick the mode from auth state (public vs authenticated).
 *   2. Screen the user's message and return a privacy warning if they appear to be about to
 *      share sensitive information.
 *   3. Execute ONLY the allow-listed tools for the mode. Authenticated tools read the DB
 *      inside an RLS-scoped transaction (SET LOCAL app.current_user_id), so a client can
 *      only ever see their own data.
 *   4. Redact any denied (PII/medical/credential) field from every tool result before it is
 *      returned or handed to the model.
 *
 * The actual Bedrock Converse call is optional and only made when configured; the tool
 * execution + guardrails are the security-critical part and run regardless.
 */

const config = require('../../config');
const logger = require('../../config/logger');
const guardrails = require('./guardrails');
const financial = require('../financial/financial.service');
const { withContext } = require('../../config/database');
const { AppError } = require('../../utils/errors');

const VALID_TABS = new Set([
  'overview', 'profile', 'financial_position', 'policies', 'goals',
  'claims', 'documents', 'service_requests', 'communications', 'settings',
]);

// ── Tool implementations ───────────────────────────────────────────────────────
const TOOLS = {
  // Public tools return only public reference data.
  get_public_faqs: async (_principal, input) => ({
    query: input && input.query,
    results: [
      { question: 'How is my information protected?', answer: 'We follow POPIA; sensitive data is encrypted and access is restricted and logged.' },
    ],
    source: 'reference',
  }),
  get_product_catalog: async () => ({
    products: [
      { code: 'LIFE', name: 'Life Insurance' },
      { code: 'RETIREMENT_ANNUITY', name: 'Retirement Annuity' },
    ],
    source: 'reference',
  }),
  get_company_info: async (_principal, input) => ({
    topic: (input && input.topic) || 'about',
    info: 'Royal Square Financial is a financial services broker and adviser.',
    source: 'reference',
  }),

  // Authenticated tools read the DB scoped to the client via RLS.
  get_client_dashboard_summary: async (principal) => {
    const clientId = requireClient(principal);
    return withContext({ userId: principal.userId, tenantId: principal.tenantId }, async () => {
      const [netWorth, cashflow, policyCount] = await Promise.all([
        financial.netWorth(clientId),
        financial.monthlyCashflow(clientId),
        countActivePolicies(clientId),
      ]);
      return { net_worth: netWorth, cashflow, policies: { active_policies: policyCount }, source: 'rds_rls' };
    });
  },

  navigate_to_tab: async (principal, input) => {
    requireClient(principal);
    const tab = input && input.tab;
    if (!VALID_TABS.has(tab)) throw new AppError('VALIDATION_ERROR', `Unknown tab: ${tab}`, 400);
    return { action: 'navigate', tab };
  },

  get_policy_details: async (principal, input) => {
    const clientId = requireClient(principal);
    return withContext({ userId: principal.userId, tenantId: principal.tenantId }, async () => {
      const policy = require('../policy/policy.service');
      const policies = await policy.listForClient(clientId);
      // Return only non-sensitive summary fields.
      const summary = policies.map((p) => ({
        id: p.id,
        provider: p.Provider ? p.Provider.trading_name : null,
        product: p.Product ? p.Product.product_name : null,
        status: p.status,
        policy_number_masked: p.policy_number_masked,
        cover_amount: p.cover_amount,
        premium: p.premium,
      }));
      if (input && input.policy_id) {
        return { mode: 'detail', policy: summary.find((s) => s.id === input.policy_id) || null, source: 'rds_rls' };
      }
      return { mode: 'list', policies: summary, source: 'rds_rls' };
    });
  },
};

function requireClient(principal) {
  if (!principal || !principal.clientId) {
    throw new AppError('FORBIDDEN', 'This tool requires an authenticated client', 403);
  }
  return principal.clientId;
}

async function countActivePolicies(clientId) {
  const { Policy } = require('../../models');
  return Policy.count({ where: { client_id: clientId, status: 'active' } });
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Choose the operating mode from the request principal. */
function modeFor(principal) {
  return principal && principal.clientId ? 'authenticated' : 'public';
}

/**
 * Execute a single tool with full guardrails. Used by the chat loop and directly testable.
 */
async function runTool({ principal, mode, toolName, input }) {
  guardrails.assertToolAllowed(mode, toolName);
  const handler = TOOLS[toolName];
  if (!handler) throw new AppError('NOT_FOUND', `Unknown tool: ${toolName}`, 404);
  const result = await handler(principal, input || {});
  return guardrails.redactDenied(result); // strip any denied field before returning
}

/**
 * Handle a chat turn. Returns { mode, warning, ... }. If Bedrock is not configured, returns
 * a safe deterministic reply so the endpoint is usable in dev without AWS.
 */
async function chat({ principal, message }) {
  const mode = modeFor(principal);
  const screen = guardrails.detectSensitiveInput(message);
  const warning = screen.sensitive ? guardrails.sensitiveInputWarning : null;

  if (screen.sensitive) {
    // Do not process a message that contains sensitive info; warn and stop.
    logger.info('koisa: sensitive input detected', { categories: screen.categories, mode });
    return { mode, warning, reply: warning, toolResults: [] };
  }

  // Bedrock is optional here; the security-critical tool gating/redaction is already covered
  // by runTool. A full Converse loop would call Bedrock and dispatch runTool for each toolUse.
  if (!config.koisa.enabled) {
    return { mode, warning, reply: 'Koisa is currently disabled.', toolResults: [] };
  }

  return {
    mode,
    warning,
    reply: `Koisa (${mode}) received your message. Available tools: ${guardrails.toolsForMode(mode).join(', ')}.`,
    availableTools: guardrails.toolsForMode(mode),
    toolResults: [],
  };
}

module.exports = { modeFor, runTool, chat, detectSensitiveInput: guardrails.detectSensitiveInput, TOOLS };
