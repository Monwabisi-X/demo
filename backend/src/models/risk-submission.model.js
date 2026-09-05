'use strict';

const { DataTypes } = require('sequelize');

/**
 * Risk profiling submission: a client's completed responses, the calculated score, the
 * resulting profile, and any adviser override. Question templates/matrices are reference
 * data (seeded); this holds the per-client result.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'RiskSubmission',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false },
      questionnaire_code: { type: DataTypes.STRING(100), allowNull: false },
      answers: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      calculated_score: { type: DataTypes.DECIMAL(8, 2) },
      calculated_profile: { type: DataTypes.STRING(80) },
      adviser_override_profile: { type: DataTypes.STRING(80) },
      target_allocation: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'completed' },
      assessed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'risk_submissions', indexes: [{ fields: ['client_id'] }] }
  );
