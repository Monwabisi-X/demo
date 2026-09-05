'use strict';

const medical = require('../services/medical/medical.service');
const { ok } = require('../utils/respond');

async function getForClient(req, res) {
  // The route requires MEDICAL_READ; decrypt is allowed here. Decryption is audited.
  const result = await medical.getForClient({
    clientId: req.params.clientId,
    decrypt: true,
    actor: req.principal,
  });
  return ok(res, result);
}

async function submit(req, res) {
  const row = await medical.submit(req.body);
  res.locals.auditEntityId = row.id;
  return ok(res, row, 201);
}

async function update(req, res) {
  return ok(res, await medical.update({ questionnaireId: req.params.questionnaireId, ...req.body }));
}

module.exports = { getForClient, submit, update };
