CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  source_name text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','reviewed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  title text NOT NULL,
  category text NOT NULL CHECK(category IN ('vehicle','property')),
  summary text NOT NULL DEFAULT '',
  price integer NOT NULL CHECK(price>=0),
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','published','rejected')),
  asset_id uuid REFERENCES assets(id),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  UNIQUE(batch_id,row_number)
);
CREATE INDEX import_rows_review_idx ON import_rows(status,batch_id,row_number);
