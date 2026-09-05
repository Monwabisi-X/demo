'use strict';

const { ok } = require('../utils/respond');

async function query(req, res) {
  const { Audit } = require('../models');
  const where = { tenant_id: req.principal.tenantId };
  if (req.query.action) where.action = req.query.action;
  const rows = await Audit.findAll({
    where,
    limit: Number(req.query.limit) || 100,
    order: [['occurred_at', 'DESC']],
  });
  return ok(res, rows);
}

async function forEntity(req, res) {
  const { Audit } = require('../models');
  const rows = await Audit.findAll({
    where: {
      tenant_id: req.principal.tenantId,
      entity_type: req.params.entityType,
      entity_id: req.params.entityId,
    },
    order: [['occurred_at', 'DESC']],
  });
  return ok(res, rows);
}

module.exports = { query, forEntity };
