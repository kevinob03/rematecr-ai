ALTER TABLE authorized_documents ADD COLUMN page_text jsonb NOT NULL DEFAULT '[]';
