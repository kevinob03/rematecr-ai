import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createExchangeService } from '../../src/services/exchange.js';

test('tipo de cambio convierte en el servidor, agrupa consultas y conserva la referencia ante fallo', async () => {
  let clock = Date.parse('2026-11-24T12:00:00Z');
  let calls = 0;
  const exchange = createExchangeService({ now: () => clock, fetchImpl: async () => {
    if (++calls > 1) throw new Error('offline');
    return Response.json([{ base: 'USD', quote: 'CRC', date: '2026-11-23', rate: 500 }]);
  } });
  const [first, second] = await Promise.all([exchange(1000),exchange(0)]);
  assert.equal(first.amountUSD, 2);
  assert.equal(second.amountUSD, 0);
  assert.equal(calls, 1);
  clock += 2 * 60 * 60_000;
  const stale = await exchange(1000);
  assert.equal(stale.status, 'stale');
  assert.equal(stale.rate, 500);
  assert.equal(stale.amountUSD, null);
});

test('una observación inválida o antigua nunca produce un equivalente en dólares', async () => {
  for (const [date, status] of [['2026-02-31','unavailable'], ['2026-12-01','unavailable'], ['2026-10-01','stale']]) {
    const exchange = createExchangeService({ now: () => Date.parse('2026-11-24T12:00:00Z'),
      fetchImpl: async () => Response.json([{ base:'USD', quote:'CRC', date, rate:500 }]) });
    const quote = await exchange(500);
    assert.equal(quote.status, status);
    assert.equal(quote.amountUSD, null);
  }
});
