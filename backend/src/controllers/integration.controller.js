'use strict';

const { ok } = require('../utils/respond');

function models() {
  return require('../models');
}

// Read-only view of straight-through provider submissions (audit + status), tenant-scoped.
async function list(req, res) {
  const { IntegrationSubmission } = models();
  const where = { tenant_id: req.principal.tenantId };
  if (req.query.clientId) where.client_id = req.query.clientId;
  if (req.query.status) where.status = req.query.status;
  const rows = await IntegrationSubmission.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: Number(req.query.limit) || 100,
  });
  return ok(res, rows);
}

async function getOne(req, res) {
  const { IntegrationSubmission } = models();
  const row = await IntegrationSubmission.findOne({
    where: { id: req.params.submissionId, tenant_id: req.principal.tenantId },
  });
  if (!row) return ok(res, null, 404);
  return ok(res, row);
}

module.exports = { list, getOne };
