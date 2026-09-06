'use strict';

/**
 * Learning / Information content service.
 *
 * Reads tenant-scoped, published educational articles (claim guides + investment explainers).
 * Content carries no client PII, so no RLS/consent gating is required — only tenant scoping
 * and the CONTENT_READ permission enforced at the route layer.
 */

const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

const PUBLIC_ATTRIBUTES = [
  'id', 'category', 'topic', 'slug', 'title', 'summary', 'body',
  'steps', 'read_minutes', 'sort_order', 'published', 'updated_at',
];

/** List published articles for a tenant, optionally filtered by category. */
async function list({ tenantId, category }) {
  const { LearningArticle } = models();
  const where = { tenant_id: tenantId, published: true };
  if (category) where.category = String(category).toUpperCase();

  return LearningArticle.findAll({
    where,
    attributes: PUBLIC_ATTRIBUTES,
    order: [
      ['sort_order', 'ASC'],
      ['title', 'ASC'],
    ],
  });
}

/** Fetch a single published article by slug within the tenant. */
async function getBySlug({ tenantId, slug }) {
  const { LearningArticle } = models();
  const article = await LearningArticle.findOne({
    where: { tenant_id: tenantId, slug, published: true },
    attributes: PUBLIC_ATTRIBUTES,
  });
  if (!article) throw new AppError('NOT_FOUND', 'Article not found', 404);
  return article;
}

module.exports = { list, getBySlug };
