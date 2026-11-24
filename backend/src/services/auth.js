import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from './app-error.js';

const TOKEN_ISSUER = 'rematecr-ai';
const TOKEN_AUDIENCE = 'rematecr-web';
const TOKEN_ALGORITHM = 'HS256';
// Keep the bcrypt cost comparable even for a username that does not exist.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5DICm4ZRSZk0S08c8ZzCMs6.DzZlPYS';

function sessionRequired() {
  return new AppError(401, 'SESSION_REQUIRED', 'Iniciá sesión para continuar.');
}

function publicUser({ id, name, email, role }) {
  return { id, name, email, role };
}

function digest(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createAuthService(model, { jwtSecret, sessionTtlSeconds = 7200 }, { sendRecovery, sendClosure } = {}, logger = console) {
  const claims = {
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  };

  function verify(token) {
    if (!token) return null;
    try {
      const payload = jwt.verify(token, jwtSecret, { ...claims, algorithms: [TOKEN_ALGORITHM] });
      return typeof payload.sub === 'string' && typeof payload.jti === 'string'
        && Number.isInteger(payload.exp) ? payload : null;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) return null;
      throw error;
    }
  }

  return {
    sessionTtlSeconds,
    listClosures: model.listClosures,
    async closureReceipt(id, approve = false) {
      const receipt = approve ? await model.approveClosure(id) : await model.closureStatus(id);
      if (!receipt) throw new AppError(404, 'UNKNOWN_FOLIO', 'No encontramos ese folio.');
      const { notifyEmail, ...publicReceipt } = receipt;
      if (notifyEmail && sendClosure) {
        try { await sendClosure(notifyEmail, id); }
        catch { logger.error('Falló el aviso de baja por correo. El resultado está disponible por folio.'); }
      }
      return publicReceipt;
    },

    policyHistory: model.policyHistory,
    async register({ name, email, password, version, terms, privacy }) {
      await model.register({ name, email, hash: await bcrypt.hash(password, 12), version, policyIds:[terms,privacy] });
    },

    async requestReset(email) {
      if (!sendRecovery) throw new AppError(503, 'MAIL_UNAVAILABLE', 'La recuperación por correo está pendiente de configuración.');
      const token = randomBytes(32).toString('base64url');
      if (await model.issueReset(email, digest(token))) {
        // SMTP latency must not disclose which addresses have accounts.
        Promise.resolve().then(() => sendRecovery(email, token)).catch(() => logger.error('Falló la entrega del correo de recuperación.'));
      }
    },

    async reset({ token, password }) {
      if (!await model.resetPassword(digest(token), await bcrypt.hash(password, 12))) {
        throw new AppError(400, 'INVALID_RESET', 'El enlace venció o ya no es válido. Solicitá otro.');
      }
    },

    async rename(id, name) {
      const user = await model.updateName(id, name);
      if (!user) throw sessionRequired();
      return user;
    },

    async close(user, password) {
      const account = await model.findByEmail(user.email);
      if (!account || !await bcrypt.compare(password, account.password_hash)) {
        throw new AppError(403, 'REAUTH_REQUIRED', 'Verificá tu contraseña actual.');
      }
      const receipt = await model.closeAccess(user.id, account.password_hash);
      if (!receipt) throw sessionRequired();
      return receipt;
    },

    async login({ email, password }) {
      const account = await model.findByEmail(email);
      const matched = await bcrypt.compare(password, account?.password_hash ?? DUMMY_HASH);
      if (!account || !matched || account.status !== 'active') {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'El correo o la contraseña no coinciden.');
      }

      const sessionId = randomUUID();
      const token = jwt.sign({}, jwtSecret, {
        ...claims,
        algorithm: TOKEN_ALGORITHM,
        subject: account.id,
        jwtid: sessionId,
        expiresIn: sessionTtlSeconds,
      });
      const created = await model.createSession({
        hash: account.password_hash,
        id: sessionId,
        userId: account.id,
        expiresAt: new Date(Date.now() + sessionTtlSeconds * 1000),
      });
      if (!created) throw sessionRequired();
      return { user: publicUser(account), token };
    },

    async getUser(token) {
      const payload = verify(token);
      if (!payload) throw sessionRequired();
      const user = await model.findActiveSession(payload.jti, payload.sub);
      if (!user) throw sessionRequired();
      return publicUser(user);
    },

    async logout(token) {
      const payload = verify(token);
      if (payload) await model.revokeSession(payload.jti, payload.sub);
    },
  };
}
