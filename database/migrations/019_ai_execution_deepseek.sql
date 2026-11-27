ALTER TABLE ai_executions DROP CONSTRAINT ai_executions_provider_check;
ALTER TABLE ai_executions ADD CONSTRAINT ai_executions_provider_check
  CHECK (provider IN ('unknown','primary','backup','deepseek'));
