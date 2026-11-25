import { extname, resolve } from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { requireWorkflowToken } from './middlewares/workflow.js';
import { createPreferencesModel } from './models/preferences.js';
import { createPreferencesService } from './services/preferences.js';
import { createPreferencesController } from './controllers/preferences.js';
import { validate } from './middlewares/validate.js';
import { schemas } from './routes/schemas.js';
import { createRequireRoles } from './middlewares/auth.js';
import { handleErrors, notFound } from './middlewares/errors.js';
import { requestContext, requireAllowedOrigin } from './middlewares/request.js';
import { createAssetModel } from './models/assets.js';
import { createAuditModel } from './models/audit.js';
import { createAuthModel } from './models/auth.js';
import { createCrmModel } from './models/crm.js';
import { createApiRouter } from './routes/api.js';
import { createAssetService } from './services/assets.js';
import { createAuditService } from './services/audit.js';
import { createAuthService } from './services/auth.js';
import { createAccountMailer } from './services/account-mail.js';
import { createCrmService } from './services/crm.js';
import { createSimulator } from './services/simulations.js';
import { createImportsModel } from './models/imports.js';
import { createImportService } from './services/imports.js';
import { createWorkflowImportController } from './controllers/workflow-imports.js';

export function createApp({ db, config, staticDir, logger = console, configureRoutes, mailer = createAccountMailer(config) }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy ?? false);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: config.secureCookies ? [] : null },
    },
    strictTransportSecurity: config.secureCookies ? undefined : false,
  }));

  const auth = createAuthService(createAuthModel(db), config, mailer, logger);
  const assets = createAssetService(createAssetModel(db));
  const audit = createAuditService(createAuditModel(db));
  const crm = createCrmService(createCrmModel(db));
  const preferenceService = createPreferencesService(createPreferencesModel(db));
  const preferences = createPreferencesController(preferenceService);
  const imports = createImportService(createImportsModel(db));
  const workflowImports=createWorkflowImportController(imports);
  app.post('/api/v1/internal/workflows/alerts', requestContext, requireWorkflowToken(config.workflowToken),
    express.json({ limit: '1kb' }), validate({ body: schemas.workflowEvent }), preferences.run);
  app.post('/api/v1/internal/workflows/imports/csv',requestContext,requireWorkflowToken(config.workflowToken),
    express.json({limit:'600kb'}),validate({body:schemas.csvImport}),workflowImports.receive);

  app.use(
    '/api/v1',
    requestContext,
    requireAllowedOrigin(config.allowedOrigins ?? []),
    // The CSV import payload is capped at 500 KB in the import service/schema.
    express.json({ limit: '600kb' }),
    createApiRouter({
      db, config, logger, auth, assets, audit, crm, imports, preferences: { ...preferences, service: preferenceService },
      simulate: createSimulator(assets),
      requireRoles: createRequireRoles(auth),
      configureRoutes,
    }),
    notFound,
  );
  app.use('/api', requestContext, notFound);

  if (staticDir) {
    const frontendDir = resolve(staticDir);
    app.use(express.static(frontendDir));
    app.get('/{*path}', (req, res, next) => {
      if (extname(req.path) || !req.accepts('html')) return next();
      return res.sendFile(resolve(frontendDir, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(handleErrors(logger));
  return app;
}
