import { AppError } from '../services/app-error.js';

export function notFound(_req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', 'No encontramos este recurso.'));
}

export function handleErrors(logger) {
  return (err, req, res, next) => {
    if (res.headersSent) return next(err);

    let status;
    let code;
    let message;
    if (err instanceof AppError) {
      ({ status, code, message } = err);
    } else if (err.type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'El contenido JSON no tiene un formato válido.';
    } else if (err.type === 'entity.too.large') {
      status = 413;
      code = 'BODY_TOO_LARGE';
      message = 'La solicitud excede el tamaño permitido.';
    } else if (err.status === 400 || err.status === 415) {
      status = err.status;
      code = 'INVALID_REQUEST';
      message = 'No se pudo leer la solicitud.';
    } else {
      status = 500;
      code = 'INTERNAL_ERROR';
      message = 'No pudimos completar la solicitud. Intentá de nuevo.';
      logger.error('Error de API', { requestId: req.requestId, name: err.name, code: err.code });
    }
    return res.status(status).json({ error: { code, message, requestId: req.requestId } });
  };
}
