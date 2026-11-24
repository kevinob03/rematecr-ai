import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createComparisonAgent } from '../../src/services/agents/compare/compare.js';

const left = { id: 'a', title: 'Vehículo A', source: 'Fuente de prueba', price: 4000000,
  costs: [{ id: 'repair', label: 'Reparaciones', amount: 1200000 }, { id: 'other', label: 'Otros', amount: 500000 }] };
const right = { ...left, id: 'b', title: 'Vehículo B', price: 4600000,
  costs: [{ ...left.costs[0], amount: 300000 }, left.costs[1]] };

function fixture(second = right, selection = ['c1', 'c2']) {
  const events = [];
  const agent = createComparisonAgent({
    assets: { get: async id => id === 'a' ? left : second },
    config: { key: 'test', url: 'https://provider.example.test', model: 'test-model' },
    executions: { begin: async (...args) => { events.push(args); return 'execution'; },
      finish: async (...args) => { events.push(args); } },
    fetchImpl: async (_, req) => {
      const content = JSON.parse(req.body).messages[1].content;
      assert.doesNotMatch(content, /Vehículo|Fuente de prueba|private-user/);
      return Response.json({ choices: [{ message: { content: JSON.stringify({ driverIds: selection }) } }] });
    },
  });
  return { events, run: (costs = []) => agent({ actorId: 'private-user', scenarios: [
    { assetId: 'a', costs }, { assetId: 'b', costs: [] },
  ] }) };
}

test('AG-07 contrasta los costos, cita ambas fuentes y distingue cero de un gasto pendiente', async () => {
  const { run, events } = fixture();
  const result = await run();
  assert.equal(result.difference, 300000);
  assert.match(result.explanation, /Vehículo B tiene un costo estimado/);
  assert.deepEqual(result.references.map(ref => ref.id), ['a','b']);
  assert.deepEqual(events.at(-1), ['execution','succeeded','OK']);
  const missing = await run([{ id: 'repair', amount: null }]);
  assert.equal(missing.difference, null);
  assert.match(missing.limits[0], /Vehículo A.*Reparaciones/);
  assert.equal((await run([{ id: 'repair', amount: 0 }])).difference, 900000);
});

test('AG-07 compara solo campos compatibles y rechaza referencias inventadas', async () => {
  const other = { ...right, costs: [{ id: 'repair', label: 'Obra civil', amount: 100 }] };
  const { run } = fixture(other, ['c1']);
  const result = await run();
  assert.equal(result.difference, null);
  assert.match(result.explanation, /Precio publicado/);
  assert.doesNotMatch(result.explanation, /Obra civil/);
  const invalid = fixture(right, ['c9']);
  await assert.rejects(invalid.run(), { code: 'AI_OUTPUT_INVALID' });
  assert.deepEqual(invalid.events.at(-1), ['execution','failed','AI_OUTPUT_INVALID']);
});
