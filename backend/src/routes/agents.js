import { rateLimit } from 'express-rate-limit';
import express from 'express';
import { join } from 'node:path';
import { repositoryRoot } from '../config/env.js';
import { z } from 'zod';
import { createSearchController } from '../controllers/search.js';
import { createDocumentsController } from '../controllers/documents.js';
import { createSearchAgent } from '../services/agents/search/search.js';
import { createScoreAgent } from '../services/agents/score/score.js';
import { createScoreController } from '../controllers/score.js';
import { createExtractAgent } from '../services/agents/extract/extract.js';
import { createDocumentsModel } from '../models/documents.js';
import { createRagAgent } from '../services/agents/rag/rag.js';
import { createRagController } from '../controllers/rag.js';
import { AppError } from '../services/app-error.js';
import { createComparisonController } from '../controllers/compare.js';
import { createComparisonAgent } from '../services/agents/compare/compare.js';
import { createFinanceController } from '../controllers/finance.js';
import { createAiExecutionModel } from '../models/ai-executions.js';
import { createFinanceAgent } from '../services/agents/finance/finance.js';
import { readAgentConfig } from '../services/agents/provider.js';
import { createRemyAgent } from '../services/agents/remy/remy.js';
import { createRemyController } from '../controllers/remy.js';

export function configureAgentRoutes({ env = process.env, fetchImpl = globalThis.fetch, storageDir } = {}) {
  storageDir ??= join(repositoryRoot,'.local','documents');
  const config = readAgentConfig(env);
  return ({ router, db, assets, preferences, requireRoles, simulate, validate, schemas }) => {
    const executions = createAiExecutionModel(db);
    const controller = createFinanceController({
      financeAgent: createFinanceAgent({ config, executions, fetchImpl }),
      simulate,
      configured: Boolean(config),
    });
    const limit = rateLimit({
      windowMs: 60_000,
      limit: 6,
      keyGenerator: (req) => req.user.id,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (req, res, next) => {
        next(new AppError(429, 'AI_RATE_LIMIT', 'Esperá un momento antes de volver a consultar la explicación.'));
      },
    });

    const documents = createDocumentsModel(db);
    const documentsController=createDocumentsController(documents);
    const extractor = createExtractAgent({config,documents,executions,storageDir,fetchImpl});
    router.get('/capabilities', (_req, res) => res.json({ financeAgent: Boolean(config), comparisonAgent: Boolean(config), searchAgent: Boolean(config), scoreAgent: true, extractAgent: Boolean(config), ragAgent: Boolean(config), remyAgent: Boolean(config) }));
    router.post('/agents/remy', requireRoles('buyer'), limit,
      validate({body:z.strictObject({query:z.string().trim().min(2).max(500)})}),
      createRemyController(createRemyAgent({config,assets,executions,fetchImpl})));
    router.get('/agents/score/:id', requireRoles('buyer'), validate({params:schemas.id}),
      createScoreController(createScoreAgent({config,assets,preferences:preferences.service,executions,fetchImpl})));
    router.post('/agents/extract', requireRoles('admin'), (req,res,next)=>{
      if(req.get('Content-Type')!=='application/pdf') return next(new AppError(415,'PDF_REQUIRED','Subí un archivo PDF.'));
      return express.raw({type:'application/pdf',limit:'8mb'})(req,res,next);
    }, async (req,res,next)=>{
      let name;
      try { name=decodeURIComponent(req.get('X-Document-Name')||'documento.pdf'); }
      catch { return next(new AppError(422,'INVALID_FILENAME','El nombre del archivo no es válido.')); }
      name=name.replace(/[\\/\\r\\n\\0]/g,'_').slice(0,180)||'documento.pdf';
      const result=await extractor({actorId:req.user.id,name,buffer:req.body});
      res.status(201).json({document:result});
    });
    router.get('/document-drafts', requireRoles('admin'), validate({query:schemas.pagination}), documentsController.pending);
    router.get('/document-drafts/history', requireRoles('admin'), validate({query:schemas.pagination}), documentsController.history);
    router.post('/agents/rag', requireRoles('buyer','admin'),
      validate({body:z.strictObject({query:z.string().trim().min(3).max(500)})}),
      createRagController(createRagAgent({config,documents,executions,fetchImpl})));
    router.patch('/document-drafts/:id', requireRoles('admin'),
      validate({params:schemas.id,body:schemas.documentReview}), documentsController.review);
    router.post('/agents/search', requireRoles('buyer'),
      validate({ body: z.strictObject({ query: z.string().trim().min(1).max(300) }) }), limit,
      createSearchController(createSearchAgent({ config, executions, fetchImpl })));
    const pair = z.tuple([schemas.simulation, schemas.simulation])
      .refine(([a, b]) => a.assetId.toLowerCase() !== b.assetId.toLowerCase());
    router.post('/agents/compare', requireRoles('buyer'),
      validate({ body: z.strictObject({ scenarios: pair }) }), limit,
      createComparisonController(createComparisonAgent({ config, assets, executions, fetchImpl })));
    router.post(
      '/agents/finance',
      requireRoles('buyer', 'admin'),
      validate({ body: schemas.simulation }),
      limit,
      controller.explain,
    );
  };
}
