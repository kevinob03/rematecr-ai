import { AppError } from '../services/app-error.js';

export function validate(sections) {
  return (req, _res, next) => {
    const validated = {};
    for (const [section, schema] of Object.entries(sections)) {
      if (section === 'body' && !req.is('application/json')) {
        throw new AppError(415, 'JSON_REQUIRED', 'Enviá la solicitud en formato JSON.');
      }
      const result = schema.safeParse(req[section]);
      if (!result.success) {
        const field = result.error.issues[0]?.path.at(0);
        const suffix = typeof field === 'string' ? ` Revisá el campo «${field}».` : '';
        throw new AppError(422, 'INVALID_INPUT', `La solicitud contiene datos inválidos.${suffix}`);
      }
      validated[section] = result.data;
    }
    req.validated = validated;
    next();
  };
}
