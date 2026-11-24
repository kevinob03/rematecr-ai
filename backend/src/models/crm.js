const requestSelection = `
  r.id, r.asset_id AS "assetId", a.title AS "assetTitle", r.subject, r.comment,
  r.stage, r.created_at AS "createdAt", r.updated_at AS "updatedAt",
  (
    SELECT COALESCE(
      jsonb_agg(jsonb_build_object('stage', h.stage, 'at', h.created_at)
        ORDER BY h.created_at, h.id),
      '[]'::jsonb
    )
    FROM crm_stage_history h
    WHERE h.request_id = r.id
  ) AS history
  FROM crm_requests r JOIN assets a ON a.id = r.asset_id
`;

async function getRequest(executor, id, ownerId) {
  const result = await executor.query(
    `SELECT ${requestSelection}
     WHERE r.id = $1 AND ($2::uuid IS NULL OR r.user_id = $2)`,
    [id, ownerId ?? null],
  );
  return result.rows[0] ?? null;
}

async function addStage(executor, id, stage, actorId) {
  await executor.query(
    `INSERT INTO crm_stage_history (request_id, stage, actor_id)
     VALUES ($1, $2, $3)`,
    [id, stage, actorId],
  );
}

export function createCrmModel(db) {
  return {
    async list(ownerId, { page, limit }) {
      const result = await db.query(
        `SELECT ${requestSelection}
         WHERE ($1::uuid IS NULL OR r.user_id = $1)
         ORDER BY r.updated_at DESC, r.id DESC
         LIMIT $2 OFFSET $3`,
        [ownerId ?? null, limit + 1, (page - 1) * limit],
      );
      return {
        items: result.rows.slice(0, limit),
        nextPage: result.rows.length > limit ? page + 1 : null,
      };
    },

    get: (id, ownerId) => getRequest(db, id, ownerId),

    create({ assetId, subject, comment, userId }) {
      return db.transaction(async (tx) => {
        const result = await tx.query(
          `INSERT INTO crm_requests (asset_id, user_id, subject, comment, stage, consented_at)
           SELECT a.id, $2, $3, $4, 'received', now() FROM assets a
           WHERE a.id = $1 AND a.status = 'published'
           RETURNING id, stage`,
          [assetId, userId, subject, comment],
        );
        const created = result.rows[0];
        if (!created) return null;
        await addStage(tx, created.id, created.stage, userId);
        return getRequest(tx, created.id, userId);
      });
    },

    setStage({ id, stage, actorId }) {
      return db.transaction(async (tx) => {
        const result = await tx.query(
          'SELECT stage FROM crm_requests WHERE id = $1 FOR UPDATE',
          [id],
        );
        const request = result.rows[0];
        if (!request) return null;
        if (request.stage !== stage) {
          await tx.query(
            'UPDATE crm_requests SET stage = $2, updated_at = now() WHERE id = $1',
            [id, stage],
          );
          await addStage(tx, id, stage, actorId);
        }
        return getRequest(tx, id);
      });
    },
  };
}
