CREATE TABLE ai_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_code text NOT NULL CHECK (agent_code ~ '^AG-0[1-8]$'),
  user_id uuid NOT NULL REFERENCES users (id),
  model text NOT NULL CHECK (length(model) BETWEEN 1 AND 128),
  status text NOT NULL CHECK (status IN ('in_progress', 'succeeded', 'failed')),
  result_code text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (completed_at IS NULL OR completed_at >= started_at),
  CHECK (
    (status = 'in_progress' AND completed_at IS NULL AND result_code IS NULL)
    OR
    (status = 'succeeded' AND completed_at IS NOT NULL AND result_code IS NOT NULL AND result_code = 'OK')
    OR
    (status = 'failed' AND completed_at IS NOT NULL AND result_code IS NOT NULL AND result_code <> 'OK')
  )
);

CREATE INDEX ai_executions_user_idx ON ai_executions (user_id, started_at DESC);
