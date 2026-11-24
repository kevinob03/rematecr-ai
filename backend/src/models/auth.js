export function createAuthModel(db) {
  return {
    register({ name, email, hash, version, policyIds }) {
      return db.transaction(async (tx) => {
        const { rows } = await tx.query(
          `INSERT INTO users(name,email,password_hash,role_id) VALUES ($1,$2,$3,'buyer')
           ON CONFLICT (email) DO NOTHING RETURNING id`, [name,email,hash]);
        if (rows.length) await tx.query('INSERT INTO account_acceptances(user_id,version) VALUES ($1,$2)', [rows[0].id,version]);
        if (rows.length && policyIds) {
          for (const policy of policyIds) {
            await tx.query('INSERT INTO policy_acceptances(user_id,policy_id) VALUES ($1,$2)',[rows[0].id,policy]);
          }
        }
      });
    },
    async policyHistory(owner) {
      const {rows} = await db.query('SELECT policy_id AS id,accepted_at AS "acceptedAt" FROM policy_acceptances WHERE user_id=$1 ORDER BY policy_id',[owner]);
      return rows;
    },

    async issueReset(email, digest) {
      return db.transaction(async (tx) => {
        const { rows } = await tx.query("SELECT id FROM users WHERE email=$1 AND status='active' FOR UPDATE", [email]);
        if (!rows.length) return false;
        await tx.query(`INSERT INTO password_resets(user_id,digest,expires_at) VALUES ($1,$2,now()+interval '20 minutes')
          ON CONFLICT (user_id) DO UPDATE SET digest=excluded.digest, expires_at=excluded.expires_at`, [rows[0].id,digest]);
        return true;
      });
    },

    resetPassword(digest, hash) {
      return db.transaction(async (tx) => {
        const { rows } = await tx.query(`SELECT u.id FROM users u JOIN password_resets r ON r.user_id=u.id
          WHERE r.digest=$1 AND u.status='active' AND r.expires_at>now() FOR UPDATE OF u`, [digest]);
        if (!rows.length) return false;
        const consumed = await tx.query('DELETE FROM password_resets WHERE digest=$1 AND expires_at>now() RETURNING user_id', [digest]);
        if (!consumed.rows.length) return false;
        await tx.query('UPDATE users SET password_hash=$2 WHERE id=$1', [rows[0].id,hash]);
        await tx.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [rows[0].id]);
        return true;
      });
    },

    closeAccess(id, hash) {
      return db.transaction(async (tx) => {
        const account = await tx.query("UPDATE users SET status='disabled' WHERE id=$1 AND password_hash=$2 AND status='active' RETURNING id", [id,hash]);
        if (!account.rows.length) return null;
        await tx.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [id]);
        await tx.query('DELETE FROM password_resets WHERE user_id=$1', [id]);
        const { rows } = await tx.query('INSERT INTO closure_requests(user_id) VALUES ($1) RETURNING id,status,requested_at AS "requestedAt"', [id]);
        return rows[0];
      });
    },

    async updateName(id, name) {
      const { rows } = await db.query("UPDATE users SET name=$2 WHERE id=$1 AND status='active' RETURNING id,name,email,role_id AS role", [id,name]);
      return rows[0];
    },

    async listClosures({ page, limit }) {
      const { rows } = await db.query(
        `SELECT id,status,requested_at AS "requestedAt" FROM closure_requests
         WHERE status='pending' ORDER BY requested_at,id LIMIT $1 OFFSET $2`, [limit+1,(page-1)*limit]);
      return { items: rows.slice(0,limit), nextPage: rows.length > limit ? page+1 : null };
    },

    async closureStatus(id) {
      const { rows } = await db.query('SELECT id,status,completed_at AS "completedAt" FROM closure_requests WHERE id=$1', [id]);
      return rows[0];
    },

    approveClosure(id) {
      return db.transaction(async (tx) => {
        const { rows } = await tx.query('SELECT status,user_id FROM closure_requests WHERE id=$1 FOR UPDATE', [id]);
        if (!rows.length) return null;
        if (rows[0].status === 'completed') return { id, status: 'completed' };
        const owner = rows[0].user_id;
        await tx.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [owner]);
        await tx.query('SELECT id FROM crm_requests WHERE user_id=$1 ORDER BY id FOR UPDATE', [owner]);
        await tx.query(`INSERT INTO archived_crm_counts(stage,requests,transitions)
          SELECT r.stage,count(*),sum((SELECT count(*) FROM crm_stage_history h WHERE h.request_id=r.id))
          FROM crm_requests r WHERE r.user_id=$1 GROUP BY r.stage ORDER BY r.stage
          ON CONFLICT (stage) DO UPDATE SET requests=archived_crm_counts.requests+excluded.requests,
          transitions=archived_crm_counts.transitions+excluded.transitions`, [owner]);
        await tx.query('DELETE FROM crm_requests WHERE user_id=$1', [owner]);
        await tx.query('UPDATE crm_stage_history SET actor_id=NULL WHERE actor_id=$1', [owner]);
        await tx.query('DELETE FROM ai_executions WHERE user_id=$1', [owner]);
        await tx.query('DELETE FROM account_acceptances WHERE user_id=$1', [owner]);
        await tx.query("UPDATE closure_requests SET user_id=NULL,status='completed',completed_at=now() WHERE id=$1", [id]);
        const deleted = await tx.query('DELETE FROM users WHERE id=$1 RETURNING email', [owner]);
        return { id, status: 'completed', notifyEmail: deleted.rows[0].email };
      });
    },
    async findByEmail(email) {
      const result = await db.query(
        `SELECT id, name, email, role_id AS role, password_hash, status
         FROM users
         WHERE email = $1`,
        [email],
      );
      return result.rows[0];
    },

    async createSession({ id, userId, expiresAt, hash }) {
      const { rows } = await db.query(
        `INSERT INTO sessions (id, user_id, expires_at)
         SELECT $1,u.id,$3 FROM users u WHERE u.id=$2 AND u.password_hash=$4 AND u.status='active'
         FOR UPDATE OF u RETURNING id`,
        [id, userId, expiresAt, hash],
      );
      return rows.length > 0;
    },

    async findActiveSession(id, userId) {
      const result = await db.query(
        `SELECT u.id, u.name, u.email, u.role_id AS role
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = $1 AND s.user_id = $2 AND s.revoked_at IS NULL
           AND s.expires_at > now() AND u.status = 'active'`,
        [id, userId],
      );
      return result.rows[0];
    },

    async revokeSession(id, userId) {
      await db.query(
        `UPDATE sessions
         SET revoked_at = now()
         WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
        [id, userId],
      );
    },
  };
}
