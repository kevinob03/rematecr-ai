export function createScoreController(score) {
  return async (req,res) => res.json(await score({actorId:req.user.id,assetId:req.validated.params.id}));
}
