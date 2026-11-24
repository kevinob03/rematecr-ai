export function createAuditController(audit) {
  return async (_req, res) => {
    res.json(await audit.summary());
  };
}
