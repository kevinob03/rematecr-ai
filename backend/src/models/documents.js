import { AppError } from '../services/app-error.js';

export function createDocumentsModel(db){
  return {
    async begin({actorId,name,digest,pages}){
      try {
        const {rows}=await db.query(`INSERT INTO authorized_documents(owner_id,original_name,sha256,page_count,extracted_fields)
          VALUES($1,$2,$3,$4,'{}') RETURNING id`,[actorId,name,digest,pages]);
        return rows[0].id;
      } catch(error) {
        if(error.code==='23505') throw new AppError(409,'DOCUMENT_DUPLICATE','Este documento ya se envió para revisión.');
        throw error;
      }
    },
    async saveDraft(id,fields){
      await db.query("UPDATE authorized_documents SET extracted_fields=$2,status='pending_review' WHERE id=$1 AND status='pending_review'",[id,fields]);
    },
    async savePageText(id,pages){
      await db.query("UPDATE authorized_documents SET page_text=$2 WHERE id=$1 AND status='pending_review'",[id,pages]);
    },
    async searchApproved(){
      const {rows}=await db.query("SELECT id,original_name AS name,page_text AS pages FROM authorized_documents WHERE status='approved' ORDER BY reviewed_at DESC,id LIMIT 100");
      return rows;
    },
    async reject(id,reason='No se pudo completar la extracción; el archivo no llegó a revisión.'){
      await db.query("UPDATE authorized_documents SET status='rejected',review_note=$2 WHERE id=$1 AND status='pending_review'",[id,reason]);
    },
    async list({page,limit}){
      const {rows}=await db.query(`SELECT id,original_name AS "originalName",page_count AS "pageCount",
        extracted_fields AS fields,status,created_at AS "createdAt" FROM authorized_documents
        WHERE status='pending_review' ORDER BY created_at,id LIMIT $1 OFFSET $2`,[limit+1,(page-1)*limit]);
      return {items:rows.slice(0,limit),nextPage:rows.length>limit?page+1:null};
    },
    async history({page,limit}){
      const {rows}=await db.query(`SELECT d.id,d.original_name AS "originalName",d.page_count AS "pageCount",
          d.status,d.review_note AS "reviewNote",d.created_at AS "createdAt",d.reviewed_at AS "reviewedAt",
          u.name AS "reviewedBy"
        FROM authorized_documents d LEFT JOIN users u ON u.id=d.reviewed_by
        WHERE d.status IN ('approved','rejected') ORDER BY COALESCE(d.reviewed_at,d.created_at) DESC,d.id
        LIMIT $1 OFFSET $2`,[limit+1,(page-1)*limit]);
      return {items:rows.slice(0,limit),nextPage:rows.length>limit?page+1:null};
    },
    async review(id,actorId,status,reason){
      const {rows}=await db.query(`UPDATE authorized_documents SET status=$3,reviewed_by=$2,reviewed_at=now(),review_note=$4
        WHERE id=$1 AND status='pending_review' RETURNING id,status,reviewed_at AS "reviewedAt",review_note AS "reviewNote"`,[id,actorId,status,reason??null]);
      return rows[0]??null;
    },
  };
}
