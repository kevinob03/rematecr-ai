import { AppError } from '../../app-error.js';
import { calculateSimulation } from '../../simulations.js';
import { selectEvidence } from '../provider.js';

const crc = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 });
const money = value => '₡' + crc.format(value);

export function createComparisonAgent({ config, assets, executions, fetchImpl }) {
  return async ({ actorId, scenarios }) => {
    if (!config) throw new AppError(503, 'AI_NOT_CONFIGURED', 'El agente de comparación aún no está configurado.');
    const [left, right] = await Promise.all(scenarios.map(async ({ assetId, costs }) => {
      const asset = await assets.get(assetId);
      return { asset, ...calculateSimulation(asset, costs) };
    }));
    const rightCosts = new Map(right.costs.map(cost => [cost.id, cost]));
    const shared = left.costs.filter(cost => rightCosts.get(cost.id)?.label === cost.label);
    const compatible = shared.length === left.costs.length && shared.length === right.costs.length;
    const facts = [{ label: 'Precio publicado', first: left.price, second: right.price }];
    for (const cost of shared) {
      const other = rightCosts.get(cost.id);
      if (cost.amount !== null && other.amount !== null) {
        facts.push({ label: cost.label, first: cost.amount, second: other.amount });
      }
    }
    const magnitude = fact => Math.abs(fact.first - fact.second);
    const candidates = facts.sort((a, b) => magnitude(b) - magnitude(a)).slice(0, 12)
      .map((fact, index) => ({ ...fact, id: 'c' + (index + 1) }));
    const execution = await executions.begin('AG-07', actorId, config.model);
    try {
      const selected = await selectEvidence({
        config, candidates, currency: 'CRC', fetchImpl,
        instruction: 'Selecciona hasta dos diferencias de mayor impacto entre el primer y segundo bien.',
      });
      const complete = compatible && left.total !== null && right.total !== null;
      const difference = complete ? Math.abs(left.total - right.total) : null;
      const limits = [left, right].filter(side => side.missing.length)
        .map(side => `${side.asset.title} tiene gastos pendientes (${side.missing.join(', ')}).`);
      if (!compatible) limits.push('Los escenarios tienen partidas diferentes. Solo se comparan campos comunes.');
      const explanation = selected.map(fact =>
        `${fact.label}: ${money(fact.first)} en ${left.asset.title} y ${money(fact.second)} en ${right.asset.title}.`
      );
      if (complete) explanation.push(difference === 0 ? 'Los costos estimados coinciden.'
        : `${left.total < right.total ? left.asset.title : right.asset.title} tiene un costo estimado ${money(difference)} menor.`);
      else explanation.push('La diferencia entre los costos totales queda pendiente.');
      const references = [left, right].map(({ asset }) => ({
        id: asset.id, title: asset.title, source: asset.source,
      }));
      await executions.finish(execution, 'succeeded', 'OK');
      return { explanation: explanation.join(' '), difference, limits, references, model: config.model };
    } catch (error) {
      await executions.finish(execution, 'failed', error instanceof AppError ? error.code : 'AI_COMPARISON_FAILED');
      throw error;
    }
  };
}
