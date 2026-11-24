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
    async reject(id){await db.query("UPDATE authorized_documents SET status='rejected' WHERE id=$1 AND status='pending_review'",[id]);},
    async list({page,limit}){
      const {rows}=await db.query(`SELECT id,original_name AS "originalName",page_count AS "pageCount",
        extracted_fields AS fields,status,created_at AS "createdAt" FROM authorized_documents
        WHERE status='pending_review' ORDER BY created_at,id LIMIT $1 OFFSET $2`,[limit+1,(page-1)*limit]);
      return {items:rows.slice(0,limit),nextPage:rows.length>limit?page+1:null};
    },
    async review(id,actorId,status){
      const {rows}=await db.query(`UPDATE authorized_documents SET status=$3,reviewed_by=$2,reviewed_at=now()
        WHERE id=$1 AND status='pending_review' RETURNING id,status,reviewed_at AS "reviewedAt"`,[id,actorId,status]);
      return rows[0]??null;
    },
  };
}
