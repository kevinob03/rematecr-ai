import {AppError} from '../services/app-error.js';

export function createImportsController(imports){
  return {
    async receive(req,res){
      res.status(202).json(await imports.receive({...req.validated.body,actorId:req.user.id}));
    },
    async pending(req,res){
      res.json(await imports.pending(req.validated.query));
    },
    async history(req,res){
      res.json(await imports.history(req.validated.query));
    },
    async batchDetails(req,res){
      const batch=await imports.batchDetails(req.validated.params.id);
      if(!batch) throw new AppError(404,'IMPORT_BATCH_NOT_FOUND','No encontramos esa importación.');
      res.json({batch});
    },
    async review(req,res){
      const result=await imports.review(req.validated.params.id,req.user.id,req.validated.body);
      if(!result) throw new AppError(404,'IMPORT_ROW_NOT_FOUND','No encontramos esa fila pendiente.');
      res.json({row:result});
    },
  };
}
