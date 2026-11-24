import {AppError} from '../services/app-error.js';

export function createImportsModel(db){
  return {
    async stage({eventId,sourceName,actorId,payloadHash,rows}){
      return db.transaction(async tx=>{
        const batch=await tx.query(`INSERT INTO import_batches(event_id,source_name,created_by,payload_hash)
          VALUES($1,$2,$3,$4) ON CONFLICT(event_id) DO NOTHING RETURNING id`,[eventId,sourceName,actorId,payloadHash]);
        if(!batch.rows.length){
          const prior=await tx.query('SELECT id,created_by,payload_hash FROM import_batches WHERE event_id=$1',[eventId]);
          if(prior.rows[0].created_by!==actorId||prior.rows[0].payload_hash!==payloadHash){
            throw new AppError(409,'IMPORT_EVENT_CONFLICT','Este identificador de envío ya se usó con otros datos. Generá una nueva importación.');
          }
          const results=await tx.query('SELECT id,status FROM import_rows WHERE batch_id=$1 ORDER BY row_number',[prior.rows[0].id]);
          return {batchId:prior.rows[0].id,rows:results.rows,replay:true};
        }
        const batchId=batch.rows[0].id;
        for(const row of rows) await tx.query(`INSERT INTO import_rows(batch_id,row_number,title,category,summary,price,source_url)
          VALUES($1,$2,$3,$4,$5,$6,$7)`,[batchId,row.rowNumber,row.title,row.category,row.summary,row.price,row.sourceUrl]);
        const staged=await tx.query('SELECT id,status FROM import_rows WHERE batch_id=$1 ORDER BY row_number',[batchId]);
        return {batchId,rows:staged.rows,replay:false};
      });
    },
    async pending({page=1,limit=50}={}){
      const {rows}=await db.query(`SELECT r.id,r.row_number AS "rowNumber",r.title,r.category,r.summary,r.price,
        r.source_url AS "sourceUrl",b.source_name AS "sourceName",r.batch_id AS "batchId"
        FROM import_rows r JOIN import_batches b ON b.id=r.batch_id
        WHERE r.status='pending_review' ORDER BY b.created_at,r.row_number LIMIT $1 OFFSET $2`,
        [limit+1,(page-1)*limit]);
      return {items:rows.slice(0,limit),nextPage:rows.length>limit?page+1:null};
    },
    async history({page=1,limit=20}={}){
      const {rows}=await db.query(`SELECT b.id,b.source_name AS "sourceName",b.created_at AS "createdAt",
          count(r.id)::int AS "totalRows",
          (count(r.id) FILTER (WHERE r.status='pending_review'))::int AS "pendingRows",
          (count(r.id) FILTER (WHERE r.status='published'))::int AS "publishedRows",
          (count(r.id) FILTER (WHERE r.status='rejected'))::int AS "rejectedRows",
          max(r.reviewed_at) AS "lastReviewedAt"
        FROM import_batches b LEFT JOIN import_rows r ON r.batch_id=b.id
        GROUP BY b.id ORDER BY b.created_at DESC,b.id DESC LIMIT $1 OFFSET $2`,
        [limit+1,(page-1)*limit]);
      return {items:rows.slice(0,limit),nextPage:rows.length>limit?page+1:null};
    },
    review(id,actorId,approve){
      return db.transaction(async tx=>{
        const {rows}=await tx.query(`SELECT r.*,b.source_name FROM import_rows r JOIN import_batches b ON b.id=r.batch_id
          WHERE r.id=$1 AND r.status='pending_review' FOR UPDATE OF r`,[id]);
        const row=rows[0];
        if(!row) return null;
        let assetId=null;
        if(approve){
          const dup=await tx.query(`SELECT id FROM assets WHERE status='published' AND category=$1
            AND lower(title)=lower($2) AND price=$3 LIMIT 1`,[row.category,row.title,row.price]);
          if(dup.rows.length) throw new AppError(409,'POSSIBLE_DUPLICATE','Hay un bien publicado con título, categoría y precio coincidentes. Revisá la ficha antes de decidir.');
          await tx.query(`INSERT INTO sources(id,name,status) VALUES($1,$2,'verified')
            ON CONFLICT(id) DO NOTHING`,['import-'+row.batch_id,row.source_name]);
          const {rows:created}=await tx.query(`INSERT INTO assets(slug,title,category,summary,price,source_id,source_url,status)
            VALUES($1,$2,$3,$4,$5,$6,$7,'published') RETURNING id`,
            ['import-'+row.id,row.title,row.category,row.summary,row.price,'import-'+row.batch_id,row.source_url]);
          assetId=created[0].id;
        }
        await tx.query('UPDATE import_rows SET status=$2,asset_id=$3,reviewed_by=$4,reviewed_at=now() WHERE id=$1',
          [id,approve?'published':'rejected',assetId,actorId]);
        return {id,status:approve?'published':'rejected',assetId};
      });
    },
  };
}
