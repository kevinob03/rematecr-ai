CREATE TABLE policy_acceptances (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_id text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, policy_id)
);
