CREATE TABLE account_acceptances (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE password_resets (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  digest text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE closure_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  requested_at timestamptz NOT NULL DEFAULT now()
);
