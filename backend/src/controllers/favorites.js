export function createFavoritesController(assets) {
  return {
    async list(req, res) {
      res.json(await assets.favorites(req.user.id, req.validated.query));
    },
    async read(req, res) {
      res.json(await assets.favorite(req.user.id, req.validated.params.id));
    },
    async save(req, res) {
      res.json(await assets.favorite(req.user.id, req.validated.params.id, true));
    },
    async remove(req, res) {
      res.json(await assets.favorite(req.user.id, req.validated.params.id, false));
    },
  };
}
