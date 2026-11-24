CREATE TABLE favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, asset_id)
);
CREATE INDEX favorites_asset_idx ON favorites(asset_id);
