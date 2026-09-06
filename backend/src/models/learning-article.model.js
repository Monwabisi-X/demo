'use strict';

const { DataTypes } = require('sequelize');

/**
 * Tenant-scoped educational content shown in the client "Information / Learning" tab.
 * Content is generic and public-safe (never advice, never client PII).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'LearningArticle',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      category: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'GUIDE' },
      topic: { type: DataTypes.STRING(60) },
      slug: { type: DataTypes.STRING(160), allowNull: false },
      title: { type: DataTypes.STRING(250), allowNull: false },
      summary: { type: DataTypes.STRING(500) },
      body: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      steps: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      read_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'learning_articles' }
  );
