-- Schema Neon per Push-Up Tracker
-- Esegui una volta nel SQL Editor di Neon (o con psql $DATABASE_URL -f schema.sql)

CREATE TABLE IF NOT EXISTS workouts (
  workout_date DATE PRIMARY KEY,
  wide    JSONB NOT NULL DEFAULT '[]'::jsonb,
  "close" JSONB NOT NULL DEFAULT '[]'::jsonb,
  diamond JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tiene updated_at aggiornato a ogni upsert
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workouts_touch ON workouts;
CREATE TRIGGER trg_workouts_touch
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- (Opzionale) multi-utente futuro:
-- ALTER TABLE workouts ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default';
-- DROP TRIGGER trg_workouts_touch ON workouts;
-- ALTER TABLE workouts DROP CONSTRAINT workouts_pkey;
-- ALTER TABLE workouts ADD PRIMARY KEY (user_id, workout_date);
