import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from '../services/app-error.js';

const digest = value => createHash('sha256').update(value).digest();
export function requireWorkflowToken(token) {
  return (req, _res, next) => {
    if (!token || token.length < 32) throw new AppError(503,'WORKFLOW_DISABLED','El flujo requiere configuración.');
    if (!timingSafeEqual(digest(req.get('Authorization') ?? ''), digest('Bearer ' + token))) {
      throw new AppError(401,'WORKFLOW_UNAUTHORIZED','Credencial de flujo inválida.');
    }
    next();
  };
}
