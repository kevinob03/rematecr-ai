ALTER TABLE ai_executions ADD COLUMN provider text NOT NULL DEFAULT 'unknown'
  CHECK (provider IN ('unknown','primary','backup'));
