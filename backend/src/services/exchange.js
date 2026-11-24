const endpoint = 'https://api.frankfurter.dev/v2/providers/bccr/rates?base=USD&quotes=CRC';
const source = 'Banco Central de Costa Rica vía Frankfurter';
const day = 86_400_000;

export function createExchangeService({ fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  let lastQuote = null;
  let refreshAfter = 0;
  let refreshing = null;
  let lastAttemptFailed = false;

  async function refresh() {
    try {
      const response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(6000), redirect: 'error' });
      if (!response.ok) throw new Error('El proveedor no está disponible');
      const data = await response.json();
      const quote = Array.isArray(data) && data.length === 1 ? data[0] : null;
      const timestamp = Date.parse(quote?.date + 'T00:00:00Z');
      if (quote?.base !== 'USD' || quote.quote !== 'CRC' || !Number.isFinite(quote.rate)
        || quote.rate <= 0 || !Number.isFinite(timestamp) || timestamp > now()
        || new Date(timestamp).toISOString().slice(0,10) !== quote.date) throw new Error('Observación inválida');
      lastQuote = { rate: quote.rate, date: quote.date };
      lastAttemptFailed = false;
      refreshAfter = now() + 60 * 60_000;
    } catch {
      lastAttemptFailed = true;
      refreshAfter = now() + 60_000;
    }
  }

  return async (amount) => {
    if (now() >= refreshAfter) {
      refreshing ??= refresh().finally(() => { refreshing = null; });
      await refreshing;
    }
    const base = { source, sourceUrl: endpoint, base: 'USD', quote: 'CRC', amountCRC: amount };
    if (!lastQuote) return { ...base, status: 'unavailable', rate: null, date: null, amountUSD: null };
    const old = now() - Date.parse(lastQuote.date + 'T00:00:00Z') >= 7 * day;
    const status = old || lastAttemptFailed ? 'stale' : 'available';
    const amountUSD = status === 'available' ? Math.round(amount / lastQuote.rate * 100) / 100 : null;
    return { ...base, ...lastQuote, status, amountUSD };
  };
}
