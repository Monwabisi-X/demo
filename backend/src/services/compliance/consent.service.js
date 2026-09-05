'use strict';

/**
 * POPIA consent / T&C acceptance records. Consent is versioned and append-only; withdrawing
 * consent writes a new record / sets withdrawn_at rather than mutating history. Acceptances
 * can be linked to the exact stored artefact (consent form / T&Cs) via evidence_document_id.
 */

const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

async function record({ clientId, purposeCode, purposeDescription, version, granted, captureMethod, sourceIp, evidenceDocumentId }) {
  const { Consent } = models();
  return Consent.create({
    client_id: clientId,
    purpose_code: purposeCode,
    purpose_description: purposeDescription,
    consent_version: version,
    granted: granted !== false,
    capture_method: captureMethod || 'web_click',
    source_ip: sourceIp || null,
    evidence_document_id: evidenceDocumentId || null,
  });
}

async function listForClient(clientId) {
  const { Consent, Document } = models();
  return Consent.findAll({
    where: { client_id: clientId },
    include: [{ model: Document, as: 'evidenceDocument', attributes: ['id', 'title', 'document_type_id'] }],
    order: [['captured_at', 'DESC']],
  });
}

/** Latest state per purpose (whether currently granted). */
async function currentState(clientId) {
  const rows = await listForClient(clientId);
  const byPurpose = {};
  for (const c of rows) {
    if (!byPurpose[c.purpose_code]) {
      byPurpose[c.purpose_code] = {
        purpose_code: c.purpose_code,
        version: c.consent_version,
        granted: c.granted && !c.withdrawn_at,
        captured_at: c.captured_at,
      };
    }
  }
  return Object.values(byPurpose);
}

async function withdraw({ clientId, purposeCode }) {
  const { Consent } = models();
  const latest = await Consent.findOne({
    where: { client_id: clientId, purpose_code: purposeCode },
    order: [['captured_at', 'DESC']],
  });
  if (!latest) throw new AppError('NOT_FOUND', 'No consent record for that purpose', 404);
  // Append a withdrawal record (history preserved).
  return Consent.create({
    client_id: clientId,
    purpose_code: purposeCode,
    purpose_description: latest.purpose_description,
    consent_version: latest.consent_version,
    granted: false,
    capture_method: 'withdrawal',
  });
}

module.exports = { record, listForClient, currentState, withdraw };
