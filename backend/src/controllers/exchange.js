export function createExchangeController(exchange) {
  return async (req, res) => res.json(await exchange(req.validated.query.amount));
}
