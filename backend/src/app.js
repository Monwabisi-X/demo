'use strict';

/**
 * Express application setup: middleware stack + route mounting.
 * The listener is started in server.js (which also wires DB/Redis and graceful shutdown).
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const config = require('./config');
const logger = require('./config/logger');

const requestContext = require('./middleware/requestContext');
const requestLogger = require('./middleware/logger');
const { rateLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { notFound } = require('./middleware/errorHandler');

const routes = require('./routes');
const webhooks = require('./routes/webhook.routes');
const { healthRouter } = require('./routes/health.routes');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Security headers.
  app.use(helmet());

  // CORS.
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.cors.origins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      credentials: true,
    })
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request context (request id, timing) + request logging.
  app.use(requestContext);
  app.use(requestLogger);

  // Health/readiness are unauthenticated and not rate-limited.
  app.use('/', healthRouter);

  // Metrics (Prometheus) in production.
  if (config.isProd) {
    const client = require('prom-client');
    client.collectDefaultMetrics();
    app.get('/metrics', async (_req, res) => {
      res.set('Content-Type', client.register.contentType);
      res.end(await client.register.metrics());
    });
  }

  // Global rate limit (auth routes add stricter limits internally).
  app.use(rateLimiter());

  // Webhooks (separate auth model — provider signatures, not JWT).
  app.use('/webhooks', webhooks);

  // Versioned API.
  app.use('/api/v1', routes);

  // 404 + centralised error handler (must be last).
  app.use(notFound);
  app.use(errorHandler);

  logger.info('Express app initialised', { env: config.env });
  return app;
}

module.exports = { createApp };
