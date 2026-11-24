export function createAssetController(assets) {
  return {
    async history(req,res) {
      res.json(await assets.priceHistory(req.validated.params.id, req.validated.query));
    },
    async list(req, res) {
      res.json(await assets.list(req.validated.query));
    },

    async get(req, res) {
      res.json({ asset: await assets.get(req.validated.params.id) });
    },
  };
}
