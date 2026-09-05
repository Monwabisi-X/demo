'use strict';

/**
 * Authentication middleware: verifies the Bearer JWT, checks the Redis blacklist, and
 * attaches `req.principal` = { userId, tenantId, clientId, roles }.
 *
 * `authenticate` is required; `optionalAuthenticate` attaches a principal if a valid token
 * is present but does not reject anonymous requests (used by the public Koisa endpoint).
 */

const jwtService = require('../services/auth/jwt.service');
const { AppError } = require('../utils/errors');

function extractToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) return token;
  return null;
}

async function resolvePrincipal(token) {
  if (await jwtService.isBlacklisted(token)) {
    throw new AppError('INVALID_TOKEN', 'Token has been revoked', 401);
  }
  let payload;
  try {
    payload = jwtService.verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('TOKEN_EXPIRED', 'Access token expired', 401);
    }
    throw new AppError('INVALID_TOKEN', 'Invalid access token', 401);
  }
  return {
    userId: payload.sub,
    tenantId: payload.tenantId,
    clientId: payload.clientId || null,
    roles: payload.roles || [],
    token,
  };
}

function authenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next(new AppError('INVALID_TOKEN', 'Authentication required', 401));
  resolvePrincipal(token)
    .then((principal) => {
      req.principal = principal;
      next();
    })
    .catch(next);
}

function optionalAuthenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  resolvePrincipal(token)
    .then((principal) => {
      req.principal = principal;
      next();
    })
    .catch(() => next()); // ignore bad token; treat as anonymous
}

module.exports = { authenticate, optionalAuthenticate, extractToken, resolvePrincipal };
