CREATE TABLE buyer_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  budget integer CHECK (budget >= 0),
  alerts_enabled boolean NOT NULL DEFAULT false,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE buyer_interests (
  user_id uuid NOT NULL REFERENCES buyer_preferences(user_id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('vehicle','property')),
  PRIMARY KEY (user_id,category)
);
CREATE TABLE asset_price_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES assets(id),
  price integer NOT NULL,
  source_id text NOT NULL REFERENCES sources(id),
  observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX price_events_asset_idx ON asset_price_events(asset_id,id DESC);
INSERT INTO asset_price_events(asset_id,price,source_id) SELECT id,price,source_id FROM assets WHERE status='published';
CREATE FUNCTION record_published_price() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status='published' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.price IS DISTINCT FROM NEW.price OR OLD.source_id IS DISTINCT FROM NEW.source_id) THEN
    INSERT INTO asset_price_events(asset_id,price,source_id) VALUES(NEW.id,NEW.price,NEW.source_id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER asset_price_event AFTER INSERT OR UPDATE OF price,status,source_id ON assets
FOR EACH ROW EXECUTE FUNCTION record_published_price();
CREATE TABLE buyer_alerts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id bigint NOT NULL REFERENCES asset_price_events(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,event_id)
);
CREATE TABLE alert_workflow_runs (
  event_key text PRIMARY KEY,
  created_count integer NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now()
);
