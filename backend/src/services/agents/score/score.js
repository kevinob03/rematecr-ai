import { z } from 'zod';
import { AppError } from '../../app-error.js';
import { requestStructured } from '../provider.js';

export const SCORE_VERSION = 'propuesta-0.1';
const proposedWeights = {
  economy: 0.4,
  useAndLocation: 0.25,
  attributes: 0.2,
  dataCompleteness: 0.15,
};

const responseSchema = z.strictObject({
  observations: z.array(z.strictObject({
    id: z.enum(['economy','useAndLocation','attributes','dataCompleteness']),
    note: z.string().trim().min(1).max(180),
  })).max(4),
});

export function calculateScoreEvidence({ budget, asset }) {
  const missing = [];
  const breakdown = Object.entries(proposedWeights).map(([id, weight]) => {
    const hasEvidence = id === 'economy' && Number.isInteger(budget)
      && Number.isInteger(asset.estimatedTotal);
    if (!hasEvidence) missing.push(id);
    return { id, weight, status: hasEvidence ? 'available' : 'missing',
      value: hasEvidence ? Math.round((asset.estimatedTotal <= budget ? 1 : budget / asset.estimatedTotal) * 100) : null };
  });
  const score = missing.length ? null
    : Math.round(breakdown.reduce((sum, part) => sum + part.value * part.weight, 0));
  return { version: SCORE_VERSION, status: score === null ? 'not_evaluable' : 'provisional',
    score, currency: 'CRC', breakdown, missing };
}

export function createScoreAgent({ config, assets, preferences, executions, fetchImpl }) {
  return async ({ actorId, assetId }) => {
    const [asset, profile] = await Promise.all([
      assets.get(assetId),
      preferences.get(actorId),
    ]);
    const calculated = calculateScoreEvidence({ budget: profile.budget, asset });
    if (!config) return { ...calculated, explanation: 'La propuesta de RemateScore no está validada. Faltan datos comprobables del bien o de tu perfil para evaluar esta afinidad.' };

    const executionId = await executions.begin('AG-05', actorId, config.model);
    try {
      const evidence = calculated.breakdown.map(({ id, weight, status, value }) => ({ id, weight, status, value }));
      const result = await requestStructured({
        config, fetchImpl, schema: responseSchema,
        instruction: 'Explica solo los componentes enumerados, su estado y valor. No calcules ni modifiques el puntaje. '
          + 'Si el estado es missing, explica que falta evidencia. Identifica los pesos como propuesta sin validar. Devuelve JSON {observations:[{id,note}]}.',
        data: { asset: { id: asset.id, title: asset.title, category: asset.category },
          proposalVersion: SCORE_VERSION, evidence },
      });
      const notes = new Map(result.observations.map(item => [item.id,item.note]));
      if (result.observations.some(item => !evidence.some(part => part.id === item.id))) {
        throw new AppError(502,'AI_OUTPUT_INVALID','La explicación del proveedor no coincide con los componentes calculados.');
      }
      const explanation = calculated.status === 'not_evaluable'
        ? 'No evaluable con la evidencia disponible. ' + calculated.missing.map(id => notes.get(id)).filter(Boolean).join(' ')
        : result.observations.map(item => notes.get(item.id)).filter(Boolean).join(' ');
      await executions.finish(executionId,'succeeded','OK');
      return { ...calculated, explanation };
    } catch (error) {
      await executions.finish(executionId,'failed',error instanceof AppError ? error.code : 'SCORE_EXPLANATION_FAILED');
      throw error;
    }
  };
}
