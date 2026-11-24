import { AppError } from './app-error.js';

export function calculateSimulation(asset, overrides) {
  const defaults = new Map(asset.costs.map(({ id, amount }) => [id, amount]));
  const amounts = new Map();
  for (const { id, amount } of overrides) {
    if (!defaults.has(id)) {
      throw new AppError(422, 'UNKNOWN_COST', 'Una partida no corresponde al bien seleccionado.');
    }
    if (amounts.has(id)) {
      throw new AppError(422, 'DUPLICATE_COST', 'Cada partida puede modificarse una sola vez.');
    }
    amounts.set(id, amount);
  }

  let subtotal = asset.price;
  const missing = [];
  const costs = asset.costs.map(({ id, label, amount }) => {
    const value = amounts.has(id) ? amounts.get(id) : amount;
    if (value === null) missing.push(label);
    else subtotal += value;
    return { id, label, amount: value };
  });

  if (costs.length === 0) missing.push('Partidas por definir');
  return {
    price: asset.price,
    costs,
    subtotal,
    total: missing.length ? null : subtotal,
    missing,
    currency: 'CRC',
  };
}

export function createSimulator(assets) {
  return async ({ assetId, costs }) => calculateSimulation(await assets.get(assetId), costs);
}
