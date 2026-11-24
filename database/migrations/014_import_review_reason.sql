ALTER TABLE import_rows ADD COLUMN review_note text;

UPDATE import_rows
SET review_note='Motivo no registrado: decisión anterior a esta migración.'
WHERE status='rejected';

ALTER TABLE import_rows ADD CONSTRAINT import_rows_rejection_note_check
  CHECK (status <> 'rejected' OR (review_note IS NOT NULL AND length(btrim(review_note)) BETWEEN 1 AND 500));
