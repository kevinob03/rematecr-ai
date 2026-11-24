export function createAiExecutionModel(db) {
  return {
    async begin(agentCode, userId, model) {
      const result = await db.query(
        `INSERT INTO ai_executions (agent_code, user_id, model, status)
         VALUES ($1, $2, $3, 'in_progress')
         RETURNING id`,
        [agentCode, userId, model],
      );
      return result.rows[0].id;
    },
    async finish(id, status, code) {
      await db.query(
        `UPDATE ai_executions
         SET status = $2, result_code = $3, completed_at = now()
         WHERE id = $1 AND status = 'in_progress'`,
        [id, status, code],
      );
    },
  };
}
