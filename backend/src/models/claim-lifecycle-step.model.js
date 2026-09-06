'use strict';

const { DataTypes } = require('sequelize');

/** Ordered steps of the multi-week motor-claim journey (assessment → repair → close). */
module.exports = (sequelize) =>
  sequelize.define(
    'ClaimLifecycleStep',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      claim_id: { type: DataTypes.UUID, allowNull: false },
      step_key: { type: DataTypes.STRING(80), allowNull: false },
      step_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },
      detail: { type: DataTypes.TEXT },
      occurred_at: { type: DataTypes.DATE },
    },
    {
      tableName: 'claim_lifecycle_steps',
      indexes: [{ unique: true, fields: ['claim_id', 'step_key'] }, { fields: ['claim_id', 'step_order'] }],
    }
  );
