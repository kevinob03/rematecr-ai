import {buildIntegrationReadiness} from '../services/integration-readiness.js';

export function createIntegrationReadinessController({env,agentConfigured,aiBackupConfigured,databaseKind}){
  const readiness=buildIntegrationReadiness({env,agentConfigured,aiBackupConfigured,databaseKind});
  return (_req,res)=>res.json(readiness);
}
