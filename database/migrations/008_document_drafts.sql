CREATE TABLE authorized_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name text NOT NULL CHECK(length(original_name) BETWEEN 1 AND 180),
  sha256 text NOT NULL,
  page_count integer NOT NULL CHECK(page_count BETWEEN 1 AND 100),
  extracted_fields jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending_review' CHECK(status IN ('pending_review','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  UNIQUE(owner_id,sha256)
);
CREATE INDEX authorized_documents_review_idx ON authorized_documents(status,created_at);
