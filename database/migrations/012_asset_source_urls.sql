ALTER TABLE assets ADD COLUMN source_url text;
ALTER TABLE assets ADD CONSTRAINT assets_source_url_https CHECK(source_url IS NULL OR source_url LIKE 'https://%');
