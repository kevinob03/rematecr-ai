import { randomUUID } from 'node:crypto';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../services/app-error.js';

const readMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requestContext(req, res, next) {
  req.requestId = randomUUID();
  res.set('X-Request-Id', req.requestId);
  res.set('Cache-Control', 'no-store');
  next();
}

export function requireAllowedOrigin(allowedOrigins) {
  const trusted = new Set(allowedOrigins);
  return (req, _res, next) => {
    if (!readMethods.has(req.method) && !trusted.has(req.get('Origin'))) {
      throw new AppError(403, 'INVALID_ORIGIN', 'El origen de la solicitud no está autorizado.');
    }
    next();
  };
}

export function limitLogin() {
  return rateLimit({
    windowMs: 10 * 60_000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Hubo demasiados intentos. Esperá antes de volver a intentarlo.',
          requestId: req.requestId,
        },
      });
    },
  });
}
