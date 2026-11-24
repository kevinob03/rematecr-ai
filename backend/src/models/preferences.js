export function createPreferencesModel(db) {
  return {
    async get(owner) {
      const { rows } = await db.query(`SELECT budget,alerts_enabled AS "alertsEnabled",
        ARRAY(SELECT category FROM buyer_interests WHERE user_id=$1 ORDER BY category) AS categories
        FROM buyer_preferences WHERE user_id=$1`, [owner]);
      return rows[0] ?? { budget: null, alertsEnabled: false, categories: [] };
    },
    save(owner, { budget, categories, alertsEnabled }) {
      return db.transaction(async tx => {
        await tx.query(`INSERT INTO buyer_preferences(user_id,budget,alerts_enabled) VALUES($1,$2,$3)
          ON CONFLICT (user_id) DO UPDATE SET budget=$2,alerts_enabled=$3,changed_at=now()`, [owner,budget,alertsEnabled]);
        await tx.query('DELETE FROM buyer_interests WHERE user_id=$1', [owner]);
        for (const category of categories) {
          await tx.query('INSERT INTO buyer_interests(user_id,category) VALUES($1,$2)', [owner,category]);
        }
      });
    },
    async alerts(owner, {page,limit}) {
      const {rows} = await db.query(`SELECT e.id::text AS id,a.id AS "assetId",a.title,e.price,
        n.created_at AS "createdAt" FROM buyer_alerts n JOIN asset_price_events e ON n.event_id=e.id
        JOIN assets a ON a.id=e.asset_id WHERE n.user_id=$1 AND a.status='published'
        ORDER BY n.created_at DESC,e.id DESC LIMIT $2 OFFSET $3`, [owner,limit+1,(page-1)*limit]);
      return {items:rows.slice(0,limit),nextPage:rows.length>limit ? page+1 : null};
    },
    runAlerts(key) {
      return db.transaction(async tx => {
        const run = await tx.query('INSERT INTO alert_workflow_runs(event_key) VALUES($1) ON CONFLICT DO NOTHING RETURNING event_key',[key]);
        if (!run.rows.length) {
          const previous = await tx.query('SELECT created_count FROM alert_workflow_runs WHERE event_key=$1',[key]);
          return { created:previous.rows[0].created_count, replay:true };
        }
        const {rows} = await tx.query(`WITH latest AS (
          SELECT DISTINCT ON(asset_id) id,asset_id,price FROM asset_price_events ORDER BY asset_id,id DESC
        ), added AS (
          INSERT INTO buyer_alerts(user_id,event_id)
          SELECT p.user_id,e.id FROM latest e JOIN assets a ON a.id=e.asset_id
          JOIN sources s ON s.id=a.source_id AND s.status IN ('verified','demo')
          JOIN buyer_interests i ON i.category=a.category JOIN buyer_preferences p ON p.user_id=i.user_id
          JOIN users u ON u.id=p.user_id
          WHERE a.status='published' AND u.status='active' AND p.alerts_enabled AND e.price <= p.budget
          ON CONFLICT DO NOTHING RETURNING 1
        ) SELECT count(*)::int AS count FROM added`);
        await tx.query('UPDATE alert_workflow_runs SET created_count=$2 WHERE event_key=$1',[key,rows[0].count]);
        return {created:rows[0].count,replay:false};
      });
    },
  };
}
