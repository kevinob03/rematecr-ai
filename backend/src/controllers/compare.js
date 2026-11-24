export function createComparisonController(compare) {
  return async (req, res) => {
    res.json(await compare({ actorId: req.user.id, scenarios: req.validated.body.scenarios }));
  };
}
