'use strict';

/**
 * Schema-first Koisa tool registry. Each entry defines its permitted mode, the exact JSON
 * schema sent to Bedrock, the matching Joi runtime validator, its server-only handler, and an
 * explicit output projection. Principal identifiers are consumed only by handlers and are
 * never included in model-visible inputs or outputs.
 */

const Joi = require('joi');
const financial = require('../financial/financial.service');
const policy = require('../policy/policy.service');
const { withContext } = require('../../config/database');
const { AppError } = require('../../utils/errors');

const VALID_TABS = Object.freeze([
  'overview',
  'financial_position',
  'policies',
  'claims',
  'documents',
  'goals',
  'learning',
  'profile',
]);
const VALID_TAB_SET = new Set(VALID_TABS);

const EMPTY_JSON_SCHEMA = Object.freeze({
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
});

function requireClient(principal) {
  if (!principal || !principal.userId || !principal.tenantId || !principal.clientId) {
    throw new AppError('FORBIDDEN', 'This tool requires an authenticated client', 403);
  }
  return principal.clientId;
}

async function countActivePolicies(clientId, transaction) {
  const { Policy } = require('../../models');
  return Policy.count({
    col: 'id',
    where: { client_id: clientId, status: 'active' },
    transaction,
  });
}

function financialProjection(result) {
  return {
    net_worth: {
      total_assets: result.net_worth.total_assets,
      total_liabilities: result.net_worth.total_liabilities,
      net_worth: result.net_worth.net_worth,
      currency_code: result.net_worth.currency_code,
    },
    cashflow: {
      total_monthly_income: result.cashflow.total_monthly_income,
      total_monthly_expenses: result.cashflow.total_monthly_expenses,
      monthly_surplus: result.cashflow.monthly_surplus,
      currency_code: result.cashflow.currency_code,
    },
    policies: { active_policies: result.policies.active_policies },
  };
}

function policyProjection(result) {
  return {
    policies: result.policies.map((item) => ({
      provider: item.provider,
      product: item.product,
      status: item.status,
    })),
  };
}

const TOOL_REGISTRY = Object.freeze({
  get_public_faqs: Object.freeze({
    description: 'Return approved public privacy and service FAQs.',
    modes: Object.freeze(['public']),
    inputJsonSchema: Object.freeze({
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 200 },
      },
      required: [],
      additionalProperties: false,
    }),
    inputValidator: Joi.object({ query: Joi.string().min(1).max(200) }).unknown(false),
    handler: async () => ({
      results: [
        {
          question: 'How is my information protected?',
          answer: 'We follow POPIA; sensitive data is encrypted and access is restricted and logged.',
        },
      ],
    }),
    project: (result) => ({
      results: result.results.map((item) => ({ question: item.question, answer: item.answer })),
    }),
  }),

  get_product_catalog: Object.freeze({
    description: 'Return the approved high-level public product categories.',
    modes: Object.freeze(['public']),
    inputJsonSchema: EMPTY_JSON_SCHEMA,
    inputValidator: Joi.object({}).unknown(false),
    handler: async () => ({
      products: [
        { code: 'LIFE', name: 'Life Insurance' },
        { code: 'RETIREMENT_ANNUITY', name: 'Retirement Annuity' },
      ],
    }),
    project: (result) => ({
      products: result.products.map((item) => ({ code: item.code, name: item.name })),
    }),
  }),

  get_company_info: Object.freeze({
    description: 'Return approved public company information.',
    modes: Object.freeze(['public']),
    inputJsonSchema: Object.freeze({
      type: 'object',
      properties: {
        topic: { type: 'string', minLength: 1, maxLength: 100 },
      },
      required: [],
      additionalProperties: false,
    }),
    inputValidator: Joi.object({ topic: Joi.string().min(1).max(100) }).unknown(false),
    handler: async () => ({
      info: 'Royal Square Financial is a financial services broker and adviser.',
    }),
    project: (result) => ({ info: result.info }),
  }),

  get_client_dashboard_summary: Object.freeze({
    description: 'Return a concise aggregate dashboard summary for the signed-in client.',
    modes: Object.freeze(['authenticated']),
    inputJsonSchema: EMPTY_JSON_SCHEMA,
    inputValidator: Joi.object({}).unknown(false),
    handler: async (principal, _input, execution = {}) => {
      const clientId = requireClient(principal);
      return withContext(
        { userId: principal.userId, tenantId: principal.tenantId, clientId },
        async (transaction) => {
          const [netWorth, cashflow, policyCount] = await Promise.all([
            financial.netWorth(clientId, { transaction }),
            financial.monthlyCashflow(clientId, { transaction }),
            countActivePolicies(clientId, transaction),
          ]);
          return {
            net_worth: netWorth,
            cashflow,
            policies: { active_policies: policyCount },
          };
        },
        { statementTimeoutMs: execution.timeoutMs }
      );
    },
    project: financialProjection,
  }),

  navigate_to_tab: Object.freeze({
    description: 'Navigate the signed-in browser to one approved dashboard tab.',
    modes: Object.freeze(['authenticated']),
    inputJsonSchema: Object.freeze({
      type: 'object',
      properties: {
        tab: { type: 'string', enum: VALID_TABS },
      },
      required: ['tab'],
      additionalProperties: false,
    }),
    inputValidator: Joi.object({ tab: Joi.string().valid(...VALID_TABS).required() }).unknown(false),
    handler: async (principal, input) => {
      requireClient(principal);
      if (!VALID_TAB_SET.has(input.tab)) {
        throw new AppError('VALIDATION_ERROR', 'Unknown dashboard tab', 400);
      }
      return { action: 'navigate', tab: input.tab };
    },
    project: (result) => ({ action: 'navigate', tab: result.tab }),
    browserAction: (result) => ({ type: 'navigate', tab: result.tab }),
  }),

  get_policy_details: Object.freeze({
    description: 'Return a bounded, non-identifying summary of the signed-in client policies.',
    modes: Object.freeze(['authenticated']),
    inputJsonSchema: EMPTY_JSON_SCHEMA,
    inputValidator: Joi.object({}).unknown(false),
    handler: async (principal, _input, execution = {}) => {
      const clientId = requireClient(principal);
      return withContext(
        { userId: principal.userId, tenantId: principal.tenantId, clientId },
        async (transaction) => {
          const policies = await policy.listForClient(clientId, {
            transaction,
            limit: 25,
            attributes: ['status', 'provider_id', 'product_id', 'created_at'],
          });
          return {
            policies: policies.map((item) => ({
              provider: item.Provider ? item.Provider.trading_name : null,
              product: item.Product ? item.Product.product_name : null,
              status: item.status,
            })),
          };
        },
        { statementTimeoutMs: execution.timeoutMs }
      );
    },
    project: policyProjection,
  }),
});

function definitionFor(name) {
  return Object.prototype.hasOwnProperty.call(TOOL_REGISTRY, name) ? TOOL_REGISTRY[name] : null;
}

function definitionsForMode(mode) {
  return Object.entries(TOOL_REGISTRY)
    .filter(([, definition]) => definition.modes.includes(mode))
    .map(([name, definition]) => ({ name, definition }));
}

function bedrockToolsForMode(mode) {
  return definitionsForMode(mode).map(({ name, definition }) => ({
    toolSpec: {
      name,
      description: definition.description,
      inputSchema: { json: definition.inputJsonSchema },
    },
  }));
}

module.exports = {
  TOOL_REGISTRY,
  VALID_TABS,
  definitionFor,
  definitionsForMode,
  bedrockToolsForMode,
};
