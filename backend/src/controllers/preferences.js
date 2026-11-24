export function createPreferencesController(service) {
  return {
    async get(req,res) { res.json(await service.get(req.user.id)); },
    async save(req,res) { await service.save(req.user.id,req.validated.body); res.status(204).end(); },
    async alerts(req,res) { res.json(await service.alerts(req.user.id,req.validated.query)); },
    async run(req,res) { res.json(await service.runAlerts(req.validated.body.eventId)); },
  };
}
