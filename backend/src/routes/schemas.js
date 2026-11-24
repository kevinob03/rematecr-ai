import { z } from 'zod';
import { CRM_STAGES } from '../services/crm.js';

function pageNumber(fallback, max) {
  return z.string()
    .regex(/^[1-9][0-9]*$/)
    .optional()
    .transform((value) => Number(value ?? fallback))
    .pipe(z.number().int().min(1).max(max));
}

const paging = {
  page: pageNumber(1, 10_000),
  limit: pageNumber(50, 100),
};
const priceFilter = z.string().regex(/^\d{1,10}$/).transform(Number).pipe(z.number().int().max(2147483647)).optional();

function newPassword() {
  return z.string().min(12).max(72).refine(value => Buffer.byteLength(value) <= 72);
}

export const schemas = {
  csvImport:z.strictObject({eventId:z.string().regex(/^[a-zA-Z0-9:_-]{1,120}$/),sourceName:z.string().trim().min(1).max(120),csv:z.string().min(1).max(500000)}),
  importReview:z.strictObject({
    approve:z.boolean(),
    reason:z.string().trim().min(1).max(500).optional(),
  }).refine(({approve,reason})=>approve||Boolean(reason),{message:'Indicá el motivo del rechazo.',path:['reason']}),
  workflowEvent: z.strictObject({ eventId: z.string().regex(/^[a-zA-Z0-9:_-]{1,120}$/) }),
  documentReview: z.strictObject({
    status:z.enum(['approved','rejected']),
    reason:z.string().trim().min(1).max(500).optional(),
  }).refine(({status,reason})=>status!=='rejected'||Boolean(reason),{message:'Indicá el motivo del rechazo.',path:['reason']}),
  preferences: z.strictObject({
    budget: z.number().int().min(0).max(2147483647).nullable(),
    categories: z.array(z.enum(['vehicle','property'])).max(2).refine(v => new Set(v).size === v.length),
    alertsEnabled: z.boolean(),
  }),
  exchange: z.strictObject({ amount: z.string().regex(/^\d{1,12}$/).transform(Number) }),
  registration: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().max(254).email(),
    password: newPassword(),
    accepted: z.literal(true),
    version: z.literal('cuenta-v2'),
    terms: z.literal('terminos-demo-v1'),
    privacy: z.literal('privacidad-demo-v1'),
  }).strict(),
  recovery: z.object({ email: z.string().trim().toLowerCase().max(254).email() }).strict(),
  reset: z.object({ token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/), password: newPassword() }).strict(),
  rename: z.object({ name: z.string().trim().min(1).max(120) }).strict(),
  closure: z.object({ password: z.string().min(1).max(72).refine(p => Buffer.byteLength(p) <= 72), confirmed: z.literal(true) }).strict(),
  id: z.object({ id: z.string().uuid() }).strict(),
  login: z.object({
    email: z.string().trim().toLowerCase().max(254).email(),
    password: z.string().min(1).max(72).refine((password) => Buffer.byteLength(password) <= 72),
  }).strict(),
  assets: z.object({
    ...paging,
    category: z.enum(['vehicle', 'property']).optional(),
    search: z.string().trim().max(120).optional(),
    minPrice: priceFilter,
    maxPrice: priceFilter,
  }).strict().refine(f => f.minPrice === undefined || f.maxPrice === undefined || f.minPrice <= f.maxPrice),
  pagination: z.object(paging).strict(),
  simulation: z.object({
    assetId: z.string().uuid(),
    costs: z.array(z.object({
      id: z.string().trim().min(1).max(64),
      amount: z.number().int().nonnegative().max(2_000_000_000).nullable(),
    }).strict()).max(35),
  }).strict(),
  crmCreate: z.object({
    assetId: z.string().uuid(),
    subject: z.string().trim().min(1).max(180),
    comment: z.string().trim().max(2_000).default(''),
    consent: z.literal(true),
  }).strict(),
  crmStage: z.object({ stage: z.enum(CRM_STAGES) }).strict(),
};
