export function createWorkflowImportController(imports){
  return {
    async receive(req,res){
      const result=await imports.receive({...req.validated.body,actorId:null});
      res.status(202).json(result);
    },
  };
}
