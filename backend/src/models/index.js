'use strict';

/**
 * Model registry + associations.
 *
 * Each model file exports a factory `(sequelize) => Model`. This module instantiates them
 * against the shared Sequelize connection and wires associations. Requiring this module has
 * no DB side effects (no queries run until you call the models).
 */

const { sequelize } = require('../config/database');

const models = {
  Tenant: require('./tenant.model')(sequelize),
  User: require('./user.model')(sequelize),
  Role: require('./role.model')(sequelize),
  Client: require('./client.model')(sequelize),
  Household: require('./household.model')(sequelize),
  Asset: require('./asset.model')(sequelize),
  Liability: require('./liability.model')(sequelize),
  Income: require('./income.model')(sequelize),
  Expense: require('./expense.model')(sequelize),
  Provider: require('./provider.model')(sequelize),
  Product: require('./product.model')(sequelize),
  Policy: require('./policy.model')(sequelize),
  Claim: require('./claim.model')(sequelize),
  Document: require('./document.model')(sequelize),
  DocumentType: require('./document-type.model')(sequelize),
  Consent: require('./consent.model')(sequelize),
  Notification: require('./notification.model')(sequelize),
  Task: require('./task.model')(sequelize),
  Audit: require('./audit.model')(sequelize),
  MedicalQuestionnaire: require('./medical-questionnaire.model')(sequelize),
  AdviserStagingQueue: require('./adviser-staging-queue.model')(sequelize),
  RiskSubmission: require('./risk-submission.model')(sequelize),
  LegacyImportStaging: require('./legacy-import-staging.model')(sequelize),
  LearningArticle: require('./learning-article.model')(sequelize),
  Goal: require('./goal.model')(sequelize),
  ReminderRule: require('./reminder-rule.model')(sequelize),
  IntegrationSubmission: require('./integration-submission.model')(sequelize),
  ServiceRequest: require('./service-request.model')(sequelize),
  ClaimLifecycleStep: require('./claim-lifecycle-step.model')(sequelize),
};

// ── Associations ─────────────────────────────────────────────────────────────
const {
  Tenant, User, Role, Client, Household, Asset, Liability, Income, Expense,
  Provider, Product, Policy, Claim, Document, DocumentType, Consent,
  Notification, Task, MedicalQuestionnaire, AdviserStagingQueue, RiskSubmission,
  LearningArticle, Goal, ReminderRule, IntegrationSubmission, ServiceRequest, ClaimLifecycleStep,
} = models;

Tenant.hasMany(User, { foreignKey: 'tenant_id' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Tenant.hasMany(LearningArticle, { foreignKey: 'tenant_id' });
LearningArticle.belongsTo(Tenant, { foreignKey: 'tenant_id' });

User.belongsToMany(Role, { through: 'user_roles', foreignKey: 'user_id', otherKey: 'role_id' });
Role.belongsToMany(User, { through: 'user_roles', foreignKey: 'role_id', otherKey: 'user_id' });

Tenant.hasMany(Client, { foreignKey: 'tenant_id' });
Client.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Household.hasMany(Client, { foreignKey: 'household_id' });
Client.belongsTo(Household, { foreignKey: 'household_id' });

Client.hasMany(Asset, { foreignKey: 'client_id' });
Asset.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(Liability, { foreignKey: 'client_id' });
Liability.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(Income, { foreignKey: 'client_id' });
Income.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(Expense, { foreignKey: 'client_id' });
Expense.belongsTo(Client, { foreignKey: 'client_id' });

Provider.hasMany(Product, { foreignKey: 'provider_id' });
Product.belongsTo(Provider, { foreignKey: 'provider_id' });

Client.hasMany(Policy, { foreignKey: 'client_id' });
Policy.belongsTo(Client, { foreignKey: 'client_id' });
Provider.hasMany(Policy, { foreignKey: 'provider_id' });
Policy.belongsTo(Provider, { foreignKey: 'provider_id' });
Product.hasMany(Policy, { foreignKey: 'product_id' });
Policy.belongsTo(Product, { foreignKey: 'product_id' });

Policy.hasMany(Claim, { foreignKey: 'policy_id' });
Claim.belongsTo(Policy, { foreignKey: 'policy_id' });
Client.hasMany(Claim, { foreignKey: 'client_id' });
Claim.belongsTo(Client, { foreignKey: 'client_id' });

DocumentType.hasMany(Document, { foreignKey: 'document_type_id' });
Document.belongsTo(DocumentType, { foreignKey: 'document_type_id' });
Client.hasMany(Document, { foreignKey: 'client_id' });
Document.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(Consent, { foreignKey: 'client_id' });
Consent.belongsTo(Client, { foreignKey: 'client_id' });
Document.hasMany(Consent, { foreignKey: 'evidence_document_id' });
Consent.belongsTo(Document, { foreignKey: 'evidence_document_id', as: 'evidenceDocument' });

Client.hasMany(Notification, { foreignKey: 'client_id' });
Notification.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(Task, { foreignKey: 'client_id' });
Task.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasOne(MedicalQuestionnaire, { foreignKey: 'client_id' });
MedicalQuestionnaire.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(AdviserStagingQueue, { foreignKey: 'client_id' });
AdviserStagingQueue.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(RiskSubmission, { foreignKey: 'client_id' });
RiskSubmission.belongsTo(Client, { foreignKey: 'client_id' });

// ── Phase 3 features ─────────────────────────────────────────────────────────
Client.hasMany(Goal, { foreignKey: 'client_id' });
Goal.belongsTo(Client, { foreignKey: 'client_id' });
Household.hasMany(Goal, { foreignKey: 'household_id' });
Goal.belongsTo(Household, { foreignKey: 'household_id' });

Tenant.hasMany(ReminderRule, { foreignKey: 'tenant_id' });
ReminderRule.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Client.hasMany(ReminderRule, { foreignKey: 'client_id' });
ReminderRule.belongsTo(Client, { foreignKey: 'client_id' });

Tenant.hasMany(IntegrationSubmission, { foreignKey: 'tenant_id' });
IntegrationSubmission.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Client.hasMany(IntegrationSubmission, { foreignKey: 'client_id' });
IntegrationSubmission.belongsTo(Client, { foreignKey: 'client_id' });

Client.hasMany(ServiceRequest, { foreignKey: 'client_id' });
ServiceRequest.belongsTo(Client, { foreignKey: 'client_id' });
Provider.hasMany(ServiceRequest, { foreignKey: 'provider_id' });
ServiceRequest.belongsTo(Provider, { foreignKey: 'provider_id' });

Claim.hasMany(ClaimLifecycleStep, { foreignKey: 'claim_id' });
ClaimLifecycleStep.belongsTo(Claim, { foreignKey: 'claim_id' });

models.sequelize = sequelize;
module.exports = models;
