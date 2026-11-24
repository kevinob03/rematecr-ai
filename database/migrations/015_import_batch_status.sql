UPDATE import_batches b
SET status='reviewed'
WHERE NOT EXISTS (
  SELECT 1 FROM import_rows r
  WHERE r.batch_id=b.id AND r.status='pending_review'
);
