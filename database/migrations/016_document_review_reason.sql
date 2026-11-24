ALTER TABLE authorized_documents ADD COLUMN review_note text;

UPDATE authorized_documents
SET review_note='Motivo no registrado: decisión anterior a esta migración.'
WHERE status='rejected';

ALTER TABLE authorized_documents ADD CONSTRAINT authorized_documents_rejection_note_check
  CHECK (status <> 'rejected' OR (review_note IS NOT NULL AND length(btrim(review_note)) BETWEEN 1 AND 500));
