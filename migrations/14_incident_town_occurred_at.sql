-- Optional town and when the incident occurred (vs reported_at system timestamp)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS town text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS incident_occurred_at timestamp;
