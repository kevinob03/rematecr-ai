export function createFinanceController({ financeAgent, simulate, configured }) {
  return {
    async explain(req, res) {
      const simulation = configured ? await simulate(req.validated.body) : null;
      const explanation = await financeAgent({ actorId: req.user.id, simulation });
      res.json(explanation);
    },
  };
}
