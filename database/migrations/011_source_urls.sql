ALTER TABLE sources ADD COLUMN source_url text;
ALTER TABLE sources ADD CONSTRAINT sources_source_url_https CHECK(source_url IS NULL OR source_url LIKE 'https://%');
