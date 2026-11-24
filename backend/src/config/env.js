import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

export function loadEnvironment() {
  for (const url of [new URL('../../.env', import.meta.url), new URL('../../../.env', import.meta.url)]) {
    try {
      process.loadEnvFile(fileURLToPath(url));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function port(value, fallback) {
  const number = Number(value || fallback);
  if (!Number.isInteger(number) || number < 1 || number > 65535) {
    throw new Error('PORT y FRONTEND_PORT deben ser puertos válidos.');
  }
  return number;
}

function originsFrom(value) {
  const origins = value?.split(',').map((entry) => entry.trim()).filter(Boolean) ?? [];
  return origins.map((entry) => {
    const url = new URL(entry);
    if (!['https:', 'http:'].includes(url.protocol) || entry.replace(/\/$/, '') !== url.origin) {
      throw new Error('CORS_ALLOWED_ORIGINS debe contener orígenes HTTP exactos.');
    }
    return url.origin;
  });
}

export function readConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const host = env.HOST || '127.0.0.1';
  const loopback = ['127.0.0.1', '::1', 'localhost'].includes(host);
  const apiPort = port(env.PORT, 4310);
  const frontendPort = port(env.FRONTEND_PORT, 5173);
  const databaseUrl = env.DATABASE_URL?.trim() || '';
  const demoData = env.DEMO_DATA === '1' || (!production && !databaseUrl && env.DEMO_DATA !== '0');
  const trustProxy = Number(env.TRUST_PROXY_HOPS || 0);
  if (!Number.isSafeInteger(trustProxy) || trustProxy < 0) {
    throw new Error('TRUST_PROXY_HOPS debe ser un entero no negativo.');
  }
  if (!loopback && (!production || demoData)) {
    throw new Error('Para escuchar fuera de loopback se requiere NODE_ENV=production y datos de producción.');
  }
  if (production && (!databaseUrl || !env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET) < 32 || demoData)) {
    throw new Error('Producción requiere DATABASE_URL, JWT_SECRET de al menos 32 bytes y DEMO_DATA desactivado.');
  }
  const explicitOrigins = originsFrom(env.CORS_ALLOWED_ORIGINS);
  if (production && (explicitOrigins.length === 0 || explicitOrigins.some((value) => !value.startsWith('https://')))) {
    throw new Error('Producción requiere orígenes HTTPS explícitos en CORS_ALLOWED_ORIGINS.');
  }
  const localOrigins = [apiPort, frontendPort].flatMap((p) => [
    `http://127.0.0.1:${p}`, `http://localhost:${p}`,
  ]);
  return {
    production,
    workflowToken: env.N8N_WORKFLOW_TOKEN,
    smtpHost: env.SMTP_HOST,
    smtpPort: port(env.SMTP_PORT, 587),
    smtpUser: env.SMTP_USER,
    smtpPassword: env.SMTP_PASSWORD,
    mailFrom: env.MAIL_FROM,
    webOrigin: explicitOrigins[0] || `http://127.0.0.1:${frontendPort}`,
    host,
    port: apiPort,
    databaseUrl,
    demoData,
    jwtSecret: env.JWT_SECRET || randomBytes(48).toString('base64url'),
    allowedOrigins: [...new Set(production ? explicitOrigins : [...localOrigins, ...explicitOrigins])],
    secureCookies: production,
    trustProxy: trustProxy || false,
  };
}
