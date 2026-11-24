CREATE TABLE roles (
  id text PRIMARY KEY,
  label text NOT NULL CHECK (length(btrim(label)) > 0)
);

INSERT INTO roles (id, label) VALUES
  ('buyer', 'Comprador'),
  ('admin', 'Administrador'),
  ('auditor', 'Auditor');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  password_hash text NOT NULL CHECK (length(password_hash) = 60),
  role_id text NOT NULL REFERENCES roles (id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX users_role_idx ON users (role_id);

CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

CREATE TABLE sources (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  status text NOT NULL CHECK (status IN ('demo', 'verified', 'unverified')),
  is_demo boolean GENERATED ALWAYS AS (status = 'demo') STORED
);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  category text NOT NULL CHECK (category IN ('vehicle', 'property')),
  summary text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK (price >= 0),
  source_id text NOT NULL REFERENCES sources (id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX assets_source_idx ON assets (source_id);
CREATE INDEX assets_catalog_idx ON assets (category, title, id) WHERE status = 'published';

CREATE TABLE asset_costs (
  id text NOT NULL CHECK (length(btrim(id)) BETWEEN 1 AND 60),
  asset_id uuid NOT NULL REFERENCES assets (id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 100),
  amount integer CHECK (amount >= 0),
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  PRIMARY KEY (asset_id, id),
  UNIQUE (asset_id, sort_order)
);

CREATE TABLE crm_stages (
  id text PRIMARY KEY,
  label text NOT NULL CHECK (length(btrim(label)) > 0)
);

INSERT INTO crm_stages (id, label) VALUES
  ('received', 'Solicitud recibida'),
  ('reviewing', 'En revisión'),
  ('follow_up', 'Seguimiento pendiente'),
  ('attended', 'Atendida'),
  ('closed', 'Cerrada');

CREATE TABLE crm_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets (id),
  user_id uuid NOT NULL REFERENCES users (id),
  subject text NOT NULL CHECK (length(btrim(subject)) BETWEEN 1 AND 180),
  comment text NOT NULL DEFAULT '' CHECK (length(comment) <= 2000),
  stage text NOT NULL DEFAULT 'received' REFERENCES crm_stages (id),
  consented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (updated_at >= created_at)
);

CREATE INDEX crm_requests_owner_order_idx ON crm_requests (user_id, updated_at DESC, id DESC);
CREATE INDEX crm_requests_board_order_idx ON crm_requests (updated_at DESC, id DESC);
CREATE INDEX crm_requests_asset_idx ON crm_requests (asset_id);
CREATE INDEX crm_requests_stage_idx ON crm_requests (stage);

CREATE TABLE crm_stage_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES crm_requests (id) ON DELETE CASCADE,
  stage text NOT NULL REFERENCES crm_stages (id),
  actor_id uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_stage_history_request_order_idx ON crm_stage_history (request_id, created_at, id);
CREATE INDEX crm_stage_history_actor_idx ON crm_stage_history (actor_id);
CREATE INDEX crm_stage_history_stage_idx ON crm_stage_history (stage);
