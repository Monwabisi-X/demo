'use strict';

/**
 * Adapter registry. To onboard a new provider (insurer or government), add its adapter module
 * here — the dispatch mesh (provider.service.js) resolves adapters by provider code and calls
 * the uniform contract (supports/map/send). Nothing else in the app changes.
 *
 * Adapters currently shipped as skeletons (configured via Secrets Manager when going live):
 *   - santam  (insurer, REST)
 *   - sars    (government, IRP5 / tax certificate)
 */

const santam = require('./santam.adapter');
const sars = require('./sars.adapter');

const ADAPTERS = {
  [santam.provider]: santam,
  [sars.provider]: sars,
};

function getAdapter(provider) {
  return ADAPTERS[provider] || null;
}

/** All provider codes that have a real adapter registered. */
function registeredProviders() {
  return Object.keys(ADAPTERS);
}

module.exports = { getAdapter, registeredProviders, ADAPTERS };
