export function createRagController(rag){
  return async(req,res)=>res.json(await rag({actorId:req.user.id,query:req.validated.body.query}));
}
