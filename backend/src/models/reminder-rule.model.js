'use strict';

const { DataTypes } = require('sequelize');

/** Recurring reminder rules (valuation cert, licence expiry, reviews, birthdays, ...). */
module.exports = (sequelize) =>
  sequelize.define(
    'ReminderRule',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      client_id: { type: DataTypes.UUID },
      reminder_type: { type: DataTypes.STRING(100), allowNull: false },
      title: { type: DataTypes.STRING(250), allowNull: false },
      audience: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'both' },
      channel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'email' },
      cadence_interval: { type: DataTypes.STRING(40), allowNull: false, defaultValue: '1 year' },
      cadence_anchor_day: { type: DataTypes.SMALLINT, allowNull: false },
      cadence_anchor_month_end: { type: DataTypes.BOOLEAN, allowNull: false },
      lead_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 14 },
      next_run_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      last_run_at: { type: DataTypes.DATE },
      entity_type: { type: DataTypes.STRING(100) },
      entity_id: { type: DataTypes.UUID },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'reminder_rules', indexes: [{ fields: ['active', 'next_run_at'] }] }
  );
