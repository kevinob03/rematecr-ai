import express, { Router } from 'express';
import { requireWorkflowToken } from '../middlewares/workflow.js';
import { requestContext } from '../middlewares/request.js';
import { validate } from '../middlewares/validate.js';
import { schemas } from './schemas.js';
import { createWorkflowImportController } from '../controllers/workflow-imports.js';

export function createWorkflowRouter({ token, preferences, imports }) {
  const router = Router();
  const workflowImports = createWorkflowImportController(imports);
  const authenticate = requireWorkflowToken(token);

  router.use(requestContext, authenticate);
  router.post('/alerts', express.json({ limit: '1kb' }), validate({ body: schemas.workflowEvent }), preferences.run);
  router.post('/imports/csv', express.json({ limit: '600kb' }), validate({ body: schemas.csvImport }), workflowImports.receive);

  return router;
}
