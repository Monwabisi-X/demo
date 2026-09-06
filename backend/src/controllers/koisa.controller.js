'use strict';

/**
 * Koisa chat endpoint. The browser contract is projected explicitly so transcripts, model
 * metadata, tool inputs/results, and authenticated database payloads can never be serialized.
 */

const koisa = require('../services/koisa/koisa.service');
const { VALID_TABS } = require('../services/koisa/tool-registry');
const { ok } = require('../utils/respond');

const VALID_ACTION_TYPES = new Set(['navigate']);
const VALID_TAB_SET = new Set(VALID_TABS);

function projectBrowserResponse(result) {
  const actions = Array.isArray(result.actions)
    ? result.actions
        .filter(
          (action) =>
            action &&
            VALID_ACTION_TYPES.has(action.type) &&
            action.type === 'navigate' &&
            VALID_TAB_SET.has(action.tab)
        )
        .map((action) => ({ type: 'navigate', tab: action.tab }))
    : [];

  return {
    mode: result.mode === 'authenticated' ? 'authenticated' : 'public',
    warning: typeof result.warning === 'string' ? result.warning : null,
    reply: typeof result.reply === 'string' ? result.reply : '',
    actions,
  };
}

async function chat(req, res) {
  const result = await koisa.chat({
    principal: req.principal || null,
    message: req.body.message,
  });
  return ok(res, projectBrowserResponse(result));
}

module.exports = { chat, projectBrowserResponse };
