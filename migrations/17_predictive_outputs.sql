CREATE TABLE IF NOT EXISTS predictive_outputs (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'Nigeria',
  model_source TEXT NOT NULL DEFAULT 'heuristic-v1',
  params JSONB NOT NULL,
  result JSONB NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictive_outputs_kind_generated_at
  ON predictive_outputs(kind, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictive_outputs_region_generated_at
  ON predictive_outputs(region, generated_at DESC);
