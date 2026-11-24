export function createAuditModel(db) {
  return {
    async summary() {
      const result = await db.query(
        `SELECT
           COALESCE(sum(stage_count), 0)::int AS "totalRequests",
           ((SELECT count(*) FROM crm_stage_history) + (SELECT COALESCE(sum(transitions),0) FROM archived_crm_counts))::int AS "totalTransitions",
           COALESCE(jsonb_object_agg(stage, stage_count), '{}'::jsonb) AS "requestsByStage"
         FROM (
           SELECT stage, sum(amount)::int AS stage_count FROM (
             SELECT stage,count(*) AS amount FROM crm_requests GROUP BY stage
             UNION ALL SELECT stage,requests FROM archived_crm_counts
           ) counts GROUP BY stage
         ) stage_counts`,
      );
      return result.rows[0];
    },
  };
}
