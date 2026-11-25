import {buildIntegrationReadiness} from '../services/integration-readiness.js';

export function createIntegrationReadinessController({env,agentConfigured,databaseKind}){
  const readiness=buildIntegrationReadiness({env,agentConfigured,databaseKind});
  return (_req,res)=>res.json(readiness);
}
