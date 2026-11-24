const selection = `
  a.id, a.title, a.category, a.summary, a.price,
  s.name AS source, s.status AS "sourceStatus", COALESCE(a.source_url,s.source_url) AS "sourceUrl",
  totals.estimated_total AS "estimatedTotal"
`;

const withSourceAndTotals = `
  FROM assets a
  JOIN sources s ON s.id = a.source_id
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN count(*) = 0 OR count(c.amount) < count(*) THEN NULL
      ELSE a.price + sum(c.amount)
    END AS estimated_total
    FROM asset_costs c WHERE c.asset_id = a.id
  ) totals
`;

function serializeAsset(row) {
  return {
    ...row,
    estimatedTotal: row.estimatedTotal === null ? null : Number(row.estimatedTotal),
  };
}

export function createAssetModel(db) {
  return {
    async listPublished({ category, search, minPrice, maxPrice, page, limit }, favoriteOwner) {
      const result = await db.query(
        `SELECT ${selection}
         ${withSourceAndTotals}
         WHERE a.status = 'published'
           AND ($1::text IS NULL OR a.category = $1)
           AND ($2::text IS NULL OR strpos(lower(a.title || ' ' || a.summary), lower($2)) > 0)
           AND ($5::integer IS NULL OR a.price >= $5)
           AND ($6::integer IS NULL OR a.price <= $6)
           AND ($7::uuid IS NULL OR EXISTS (SELECT 1 FROM favorites f WHERE f.asset_id=a.id AND f.user_id=$7))
         ORDER BY a.title, a.id
         LIMIT $3 OFFSET $4`,
        [category ?? null, search || null, limit + 1, (page - 1) * limit, minPrice ?? null, maxPrice ?? null, favoriteOwner ?? null],
      );
      return {
        items: result.rows.slice(0, limit).map(serializeAsset),
        nextPage: result.rows.length > limit ? page + 1 : null,
      };
    },

    async hasFavorite(owner, assetId) {
      const result = await db.query('SELECT 1 FROM favorites WHERE user_id=$1 AND asset_id=$2', [owner, assetId]);
      return result.rows.length > 0;
    },
    async priceHistory(assetId, {page,limit}) {
      const {rows} = await db.query(`SELECT e.id::text AS id,e.price,s.name AS source,e.observed_at AS "observedAt"
        FROM asset_price_events e JOIN assets a ON a.id=e.asset_id JOIN sources s ON s.id=e.source_id
        WHERE e.asset_id=$1 AND a.status='published' ORDER BY e.id DESC LIMIT $2 OFFSET $3`,
        [assetId,limit+1,(page-1)*limit]);
      return { items:rows.slice(0,limit), nextPage:rows.length>limit ? page+1 : null };
    },
    async saveFavorite(owner, assetId) {
      await db.query(`INSERT INTO favorites(user_id,asset_id) SELECT $1,id FROM assets
        WHERE id=$2 AND status='published' ON CONFLICT DO NOTHING`, [owner, assetId]);
    },
    async removeFavorite(owner, assetId) {
      await db.query('DELETE FROM favorites WHERE user_id=$1 AND asset_id=$2', [owner, assetId]);
    },

    async findPublished(id) {
      const result = await db.query(
        `SELECT ${selection}, (
           SELECT COALESCE(
             jsonb_agg(jsonb_build_object('id', c.id, 'label', c.label, 'amount', c.amount)
               ORDER BY c.sort_order, c.id),
             '[]'::jsonb
           )
           FROM asset_costs c WHERE c.asset_id = a.id
         ) AS costs
         ${withSourceAndTotals}
         WHERE a.id = $1 AND a.status = 'published'`,
        [id],
      );
      return result.rows[0] ? serializeAsset(result.rows[0]) : null;
    },
  };
}
