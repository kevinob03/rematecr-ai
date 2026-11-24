import { createTransport } from 'nodemailer';

export function createAccountMailer(config) {
  if (!config.smtpHost || !config.mailFrom) return {};
  const transport = createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    requireTLS: config.production || Boolean(config.smtpUser),
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPassword } : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  const deliver = (email, subject, text) => transport.sendMail({
    from: config.mailFrom, to: { address: email, name: '' },
    subject, text,
  });
  return {
    sendRecovery: (email, token) => deliver(email, 'Recuperá el acceso a RemateCR AI',
      `Abrí este enlace durante los próximos 20 minutos para cambiar tu contraseña:\n${config.webOrigin}/restablecer#${token}\nSi no solicitaste este cambio, podés ignorar el mensaje.`),
    sendClosure: (email, id) => deliver(email, 'Tu baja de RemateCR AI está completada',
      `Completamos tu solicitud de baja con folio ${id}. Podés consultar el estado en ${config.webOrigin}/baja-recibida.`),
  };
}
