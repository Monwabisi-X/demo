'use strict';

const learningService = require('../services/learning/learning.service');
const { ok } = require('../utils/respond');

async function list(req, res) {
  return ok(res, await learningService.list({
    tenantId: req.principal.tenantId,
    category: req.query.category,
  }));
}

async function getOne(req, res) {
  return ok(res, await learningService.getBySlug({
    tenantId: req.principal.tenantId,
    slug: req.params.slug,
  }));
}

module.exports = { list, getOne };
