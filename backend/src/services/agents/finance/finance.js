import { AppError } from '../../app-error.js';
import { selectEvidence } from '../provider.js';
export { readAgentConfig as readFinanceConfig } from '../provider.js';

const MAX_CANDIDATES = 12;

function candidatesFrom(simulation) {
  return simulation.costs
    .filter(({ amount }) => amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, MAX_CANDIDATES)
    .map(({ label, amount }, index) => ({ id: `c${index + 1}`, label: label.slice(0, 100), amount }));
}

function colones(amount) {
  return `₡${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function explainSimulation(simulation, drivers) {
  const price = `El precio publicado es de ${colones(simulation.price)}.`;
  const highlights = drivers.length
    ? ` Partidas destacadas: ${drivers.map(({ label, amount }) => `${label} (${colones(amount)})`).join(', ')}.`
    : '';
  if (simulation.total !== null) {
    return `${price}${highlights} Con las partidas indicadas, el costo total estimado es de ${colones(simulation.total)}.`;
  }
  return `${price}${highlights} El subtotal conocido es de ${colones(simulation.subtotal)}. `
    + `El costo total queda pendiente: ${simulation.missing.join(', ')}.`;
}

export function createFinanceAgent({ config, executions, fetchImpl = globalThis.fetch }) {
  return async ({ actorId, simulation }) => {
    if (!config) throw new AppError(503, 'AI_NOT_CONFIGURED', 'El agente de costos aún no está configurado.');
    const id = await executions.begin('AG-06', actorId, config.model);
    let explanation;
    try {
      const drivers = await selectEvidence({
        config, candidates: candidatesFrom(simulation), currency: simulation.currency, fetchImpl,
        instruction: 'Selecciona de 1 a 2 identificadores de las partidas conocidas con mayor impacto en el costo.',
      });
      explanation = explainSimulation(simulation, drivers);
    } catch (error) {
      const code = error instanceof AppError ? error.code : 'AI_EXPLANATION_FAILED';
      await executions.finish(id, 'failed', code);
      throw error;
    }
    await executions.finish(id, 'succeeded', 'OK');
    return { explanation, model: config.model };
  };
}
