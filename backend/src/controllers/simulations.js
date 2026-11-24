export function createSimulationController(simulate) {
  return async (req, res) => {
    res.json(await simulate(req.validated.body));
  };
}
