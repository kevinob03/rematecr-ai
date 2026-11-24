export function createRemyController(remy){
  return async(req,res)=>res.json(await remy({actorId:req.user.id,query:req.validated.body.query}));
}
