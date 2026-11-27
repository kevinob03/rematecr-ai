import {buildIntegrationReadiness} from '../services/integration-readiness.js';

export function createIntegrationReadinessController({env,agentConfigured,aiBackupConfigured,aiDeepseekConfigured,databaseKind}){
  const readiness=buildIntegrationReadiness({env,agentConfigured,aiBackupConfigured,aiDeepseekConfigured,databaseKind});
  return (_req,res)=>res.json(readiness);
}
