import { AppError } from '../services/app-error.js';

export function createHealthController(db, logger) {
  return async (req, res) => {
    try {
      await db.query('SELECT 1');
    } catch {
      logger.error('La base de datos no respondió', { requestId: req.requestId });
      throw new AppError(503, 'DATABASE_UNAVAILABLE', 'La base de datos no está disponible.');
    }
    res.json({ status: 'ok', database: 'ok' });
  };
}
