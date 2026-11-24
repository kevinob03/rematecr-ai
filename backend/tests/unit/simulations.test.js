import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSimulation } from '../../src/services/simulations.js';

const vehicleA = {
  price: 4_000_000,
  costs: [
    { id: 'repair', label: 'Reparaciones estimadas', amount: 1_200_000 },
    { id: 'other', label: 'Otros gastos', amount: 500_000 },
  ],
};

test('calcula el total completo con las partidas predeterminadas', () => {
  const result = calculateSimulation(vehicleA, []);
  assert.equal(result.subtotal, 5_700_000);
  assert.equal(result.total, 5_700_000);
  assert.deepEqual(result.missing, []);
});

test('un gasto desconocido conserva el subtotal y deja el total pendiente', () => {
  const result = calculateSimulation(vehicleA, [{ id: 'repair', amount: null }]);
  assert.equal(result.subtotal, 4_500_000);
  assert.equal(result.total, null);
  assert.deepEqual(result.missing, ['Reparaciones estimadas']);
});

test('un gasto informado de cero es un valor conocido', () => {
  const result = calculateSimulation(vehicleA, [{ id: 'repair', amount: 0 }]);
  assert.equal(result.total, 4_500_000);
  assert.deepEqual(result.missing, []);
});

test('un bien sin partidas tiene únicamente el monto base conocido', () => {
  const result = calculateSimulation({ price: 30_000_000, costs: [] }, []);
  assert.equal(result.subtotal, 30_000_000);
  assert.equal(result.total, null);
  assert.deepEqual(result.missing, ['Partidas por definir']);
});

test('rechaza partidas de otro bien y ediciones duplicadas', () => {
  assert.throws(
    () => calculateSimulation(vehicleA, [{ id: 'unknown', amount: 0 }]),
    { code: 'UNKNOWN_COST' },
  );
  assert.throws(
    () => calculateSimulation(vehicleA, [{ id: 'repair', amount: null }, { id: 'repair', amount: 0 }]),
    { code: 'DUPLICATE_COST' },
  );
});
