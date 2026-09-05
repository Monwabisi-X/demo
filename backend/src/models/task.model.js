'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Task',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID },
      assigned_user_id: { type: DataTypes.UUID },
      title: { type: DataTypes.STRING(250), allowNull: false },
      description: { type: DataTypes.TEXT },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
      priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'normal' },
      due_at: { type: DataTypes.DATE },
      completed_at: { type: DataTypes.DATE },
      entity_type: { type: DataTypes.STRING(100) },
      entity_id: { type: DataTypes.UUID },
    },
    { tableName: 'tasks', indexes: [{ fields: ['assigned_user_id', 'status'] }] }
  );
