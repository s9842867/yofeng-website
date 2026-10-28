CREATE TABLE IF NOT EXISTS news (
  id BIGSERIAL PRIMARY KEY,
  publish_date DATE NOT NULL,
  external_url TEXT,
  translations JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS news_publish_date_idx ON news (publish_date DESC, id DESC);
