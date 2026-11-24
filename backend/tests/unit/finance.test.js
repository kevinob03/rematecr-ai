import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createFinanceAgent, readFinanceConfig } from '../../src/services/agents/finance/finance.js';

const config = { url: 'https://example.test/v1/chat/completions', key: 'test-only', model: 'demo-model' };
const simulation = {
  price: 4_000_000,
  costs: [
    { id: 'repair', label: 'Reparaciones estimadas', amount: null },
    { id: 'other', label: 'Otros gastos estimados', amount: 500_000 },
  ],
  subtotal: 4_500_000,
  total: null,
  missing: ['Reparaciones estimadas'],
  currency: 'CRC',
};

const response = (selection) => Response.json({
  choices: [{ message: { content: JSON.stringify(selection) } }],
});

function executionSpy() {
  const events = [];
  return {
    events,
    async begin(...args) {
      events.push(['begin', ...args]);
      return 'attempt';
    },
    async finish(...args) {
      events.push(['finish', ...args]);
    },
  };
}

test('AG-06 envía solo partidas conocidas y conserva el subtotal y la incertidumbre', async () => {
  const executions = executionSpy();
  const explain = createFinanceAgent({
    config, executions,
    fetchImpl: async (url, request) => {
      assert.equal(url, config.url);
      const body = JSON.parse(request.body);
      assert.deepEqual(JSON.parse(body.messages[1].content), {
        currency: 'CRC',
        candidates: [{ id: 'c1', label: 'Otros gastos estimados', amount: 500_000 }],
      });
      return response({ driverIds: ['c1'] });
    },
  });

  const result = await explain({ actorId: 'private-buyer', simulation });
  assert.equal(result.model, 'demo-model');
  assert.match(result.explanation, /subtotal conocido es de ₡4\.500\.000/);
  assert.match(result.explanation, /costo total queda pendiente: Reparaciones estimadas/);
  assert.deepEqual(executions.events, [
    ['begin', 'AG-06', 'private-buyer', 'demo-model'],
    ['finish', 'attempt', 'succeeded', 'OK'],
  ]);
});

test('AG-06 rechaza identificadores ajenos y texto adicional del proveedor', async () => {
  for (const selection of [
    { driverIds: ['c3'] },
    { driverIds: ['c1'], explanation: '₡9.900.000' },
  ]) {
    const executions = executionSpy();
    const explain = createFinanceAgent({ config, executions, fetchImpl: async () => response(selection) });

    await assert.rejects(explain({ actorId: 'buyer', simulation }), { status: 502, code: 'AI_OUTPUT_INVALID' });
    assert.deepEqual(executions.events.at(-1), ['finish', 'attempt', 'failed', 'AI_OUTPUT_INVALID']);
  }
});

test('AG-06 no se activa con configuración incompleta o una URL remota sin HTTPS', async () => {
  const env = { AI_API_URL: 'http://example.test/v1/chat/completions', AI_API_KEY: 'test-only', AI_MODEL: 'model' };
  assert.equal(readFinanceConfig(env), null);
  assert.equal(readFinanceConfig({ AI_API_URL: config.url }), null);
  const executions = executionSpy();
  const explain = createFinanceAgent({
    config: null, executions, fetchImpl: async () => assert.fail('No debe llamar a la red'),
  });

  await assert.rejects(explain({ actorId: 'buyer', simulation }), { status: 503, code: 'AI_NOT_CONFIGURED' });
  assert.deepEqual(executions.events, []);
});
