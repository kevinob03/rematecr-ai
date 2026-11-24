import {AppError} from '../services/app-error.js';

export function createDocumentsController(documents){
  return {
    async pending(req,res){
      res.json(await documents.list(req.validated.query));
    },
    async history(req,res){
      res.json(await documents.history(req.validated.query));
    },
    async review(req,res){
      const {status,reason}=req.validated.body;
      const document=await documents.review(req.validated.params.id,req.user.id,status,reason);
      if(!document) throw new AppError(404,'DRAFT_NOT_FOUND','No encontramos un borrador pendiente.');
      res.json({document});
    },
  };
}
