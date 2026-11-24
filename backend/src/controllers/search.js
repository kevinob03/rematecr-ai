export function createSearchController(search) {
  return async (req, res) => {
    res.json(await search({ actorId: req.user.id, query: req.validated.body.query }));
  };
}
