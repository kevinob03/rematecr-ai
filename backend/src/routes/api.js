import { Router } from 'express';
import { createFavoritesController } from '../controllers/favorites.js';
import { createExchangeController } from '../controllers/exchange.js';
import { createExchangeService } from '../services/exchange.js';
import { createAssetController } from '../controllers/assets.js';
import { createAuditController } from '../controllers/audit.js';
import { createAuthController } from '../controllers/auth.js';
import { createCrmController } from '../controllers/crm.js';
import { createHealthController } from '../controllers/health.js';
import { createSimulationController } from '../controllers/simulations.js';
import { createImportsController } from '../controllers/imports.js';
import { limitLogin } from '../middlewares/request.js';
import { validate } from '../middlewares/validate.js';
import { schemas } from './schemas.js';

export function createApiRouter({ db, config, logger, auth, assets, audit, crm, imports, preferences, simulate, requireRoles, configureRoutes }) {
  const router = Router();
  const authController = createAuthController(auth, config);
  const assetController = createAssetController(assets);
  const crmController = createCrmController(crm);
  const importsController = createImportsController(imports);

  router.get('/health', createHealthController(db, logger));
  router.get('/policies', authController.policies);
  router.get('/auth/acceptances', requireRoles(), authController.acceptances);
  router.get('/preferences', requireRoles('buyer'), preferences.get);
  router.put('/preferences', requireRoles('buyer'), validate({body:schemas.preferences}), preferences.save);
  router.get('/alerts', requireRoles('buyer'), validate({query:schemas.pagination}), preferences.alerts);
  router.get('/exchange-rate', validate({ query: schemas.exchange }), createExchangeController(createExchangeService()));
  router.post('/auth/register', limitLogin(), validate({ body: schemas.registration }), authController.register);
  router.post('/auth/recover', limitLogin(), validate({ body: schemas.recovery }), authController.recover);
  router.post('/auth/reset', limitLogin(), validate({ body: schemas.reset }), authController.reset);
  router.patch('/auth/me', requireRoles(), validate({ body: schemas.rename }), authController.rename);
  router.post('/auth/closure', requireRoles(), limitLogin(), validate({ body: schemas.closure }), authController.close);
  router.get('/auth/closures', requireRoles('admin'), validate({ query: schemas.pagination }), authController.listClosures);
  router.post('/auth/closure-status', limitLogin(), validate({ body: schemas.id }), authController.status);
  router.post('/auth/closures/:id/approve', requireRoles('admin'), validate({ params: schemas.id }), authController.approve);
  router.post('/auth/login', limitLogin(), validate({ body: schemas.login }), authController.login);
  router.get('/auth/me', requireRoles(), authController.me);
  router.post('/auth/logout', authController.logout);

  router.get('/assets', validate({ query: schemas.assets }), assetController.list);
  router.post('/imports/csv',requireRoles('admin'),validate({body:schemas.csvImport}),importsController.receive);
  router.get('/imports/pending',requireRoles('admin'),validate({query:schemas.pagination}),importsController.pending);
  router.get('/imports/history',requireRoles('admin'),validate({query:schemas.pagination}),importsController.history);
  router.get('/imports/batches/:id',requireRoles('admin'),validate({params:schemas.id}),importsController.batchDetails);
  router.patch('/imports/:id',requireRoles('admin'),validate({params:schemas.id,body:schemas.importReview}),importsController.review);
  const favorites = createFavoritesController(assets);
  router.get('/favorites', requireRoles('buyer'), validate({ query: schemas.pagination }), favorites.list);
  router.route('/favorites/:id').all(requireRoles('buyer'), validate({ params: schemas.id }))
    .get(favorites.read).put(favorites.save).delete(favorites.remove);
  router.get('/assets/:id', validate({ params: schemas.id }), assetController.get);
  router.get('/assets/:id/prices', validate({params:schemas.id,query:schemas.pagination}), assetController.history);
  router.post(
    '/simulations',
    requireRoles('buyer', 'admin'),
    validate({ body: schemas.simulation }),
    createSimulationController(simulate),
  );

  router.get(
    '/crm/requests',
    requireRoles('buyer', 'admin'),
    validate({ query: schemas.pagination }),
    crmController.list,
  );
  router.post(
    '/crm/requests',
    requireRoles('buyer'),
    validate({ body: schemas.crmCreate }),
    crmController.create,
  );
  router.get(
    '/crm/requests/:id',
    requireRoles('buyer', 'admin'),
    validate({ params: schemas.id }),
    crmController.get,
  );
  router.patch(
    '/crm/requests/:id/stage',
    requireRoles('admin'),
    validate({ params: schemas.id, body: schemas.crmStage }),
    crmController.setStage,
  );
  router.get('/audit/summary', requireRoles('admin', 'auditor'), createAuditController(audit));

  configureRoutes?.({ router, db, assets, preferences, requireRoles, simulate, validate, schemas });
  return router;
}
