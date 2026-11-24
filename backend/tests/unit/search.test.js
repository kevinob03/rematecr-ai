import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSearchAgent } from '../../src/services/agents/search/search.js';

function fixture(reply) {
  const events = [];
  const agent = createSearchAgent({
    config: { url: 'https://provider.example.test/chat/completions', key: 'demo', model: 'test' },
    executions: { begin: async (...args) => { events.push(args); return 'run'; },
      finish: async (...args) => { events.push(args); } },
    fetchImpl: async (_, request) => {
      const data = JSON.parse(JSON.parse(request.body).messages[1].content);
      assert.deepEqual(Object.keys(data), ['query']);
      return Response.json({ choices: [{ message: { content: JSON.stringify(reply) } }] });
    },
  });
  return { events, run: () => agent({ actorId: 'buyer', query: 'Vehículos de hasta cuatro millones' }) };
}

test('AG-01 devuelve solamente filtros permitidos y registra la ejecución', async () => {
  const filters = { category: 'vehicle', minPrice: 0, maxPrice: 4000000 };
  const { run, events } = fixture(filters);
  assert.deepEqual(await run(), { filters });
  assert.deepEqual(events.at(-1), ['run','succeeded','OK']);
});

test('AG-01 rechaza condiciones no expresables, campos inventados y rangos inválidos', async () => {
  for (const value of [{ unsupported: true }, {}, { category: 'other' }, { minPrice: 10, maxPrice: 1 }, { sql: 'extra' }]) {
    const { run, events } = fixture(value);
    const code = value.unsupported ? 'UNSUPPORTED_FILTER' : 'AI_OUTPUT_INVALID';
    await assert.rejects(run(), { code });
    assert.deepEqual(events.at(-1), ['run','failed',code]);
  }
});
