ALTER TABLE import_batches ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE import_batches ADD COLUMN submission_method text NOT NULL DEFAULT 'admin'
  CHECK (submission_method IN ('admin','workflow'));
ALTER TABLE import_batches ADD CONSTRAINT import_batches_submitter_check
  CHECK ((submission_method='admin' AND created_by IS NOT NULL)
      OR (submission_method='workflow' AND created_by IS NULL));
