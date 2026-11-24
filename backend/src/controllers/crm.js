export function createCrmController(crm) {
  return {
    async list(req, res) {
      res.json(await crm.list(req.user, req.validated.query));
    },

    async get(req, res) {
      res.json({ request: await crm.get(req.user, req.validated.params.id) });
    },

    async create(req, res) {
      const request = await crm.create(req.user, req.validated.body);
      res.status(201).json({ request });
    },

    async setStage(req, res) {
      const request = await crm.setStage(req.user, req.validated.params.id, req.validated.body.stage);
      res.json({ request });
    },
  };
}
