'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Notification',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID },
      user_id: { type: DataTypes.UUID },
      channel: { type: DataTypes.STRING(30), allowNull: false }, // email, sms, whatsapp, in_app
      template_code: { type: DataTypes.STRING(100) },
      recipient: { type: DataTypes.STRING(320) },
      message_body_snapshot: { type: DataTypes.TEXT },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'queued' },
      retry_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      queued_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      sent_at: { type: DataTypes.DATE },
      failed_at: { type: DataTypes.DATE },
      failure_reason: { type: DataTypes.TEXT },
      reminder_rule_id: { type: DataTypes.UUID },
      scheduled_for: { type: DataTypes.DATE },
      audience: { type: DataTypes.STRING(20) },
      processing_started_at: { type: DataTypes.DATE },
    },
    {
      tableName: 'notifications',
      indexes: [
        { unique: true, fields: ['reminder_rule_id', 'scheduled_for', 'audience'] },
        { fields: ['status', 'processing_started_at', 'queued_at', 'id'] },
      ],
    }
  );
