CREATE TABLE archived_crm_counts (
  stage text PRIMARY KEY REFERENCES crm_stages(id),
  requests bigint NOT NULL CHECK (requests >= 0),
  transitions bigint NOT NULL CHECK (transitions >= 0)
);

ALTER TABLE closure_requests ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE closure_requests ADD COLUMN completed_at timestamptz;
ALTER TABLE crm_stage_history ALTER COLUMN actor_id DROP NOT NULL;
