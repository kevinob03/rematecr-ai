import { AppError } from '../services/app-error.js';

export const SESSION_COOKIE = 'rematecr_session';

export function sessionToken(req) {
  for (const cookie of (req.headers.cookie ?? '').split(';')) {
    const prefix = `${SESSION_COOKIE}=`;
    const value = cookie.trim();
    if (value.startsWith(prefix)) return value.slice(prefix.length);
  }
  return undefined;
}

export function createRequireRoles(auth) {
  return (...roles) => async (req, _res, next) => {
    req.user = await auth.getUser(sessionToken(req));
    if (roles.length && !roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Tu cuenta no tiene permiso para esta acción.');
    }
    next();
  };
}
