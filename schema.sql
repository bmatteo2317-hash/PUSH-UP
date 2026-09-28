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

-- ============================================================
-- Classifica community (v2: dati personali restano in localStorage,
-- qui solo aggregati ANONIMI pubblicati su opt-in: PB, totali, streak)
-- ============================================================
CREATE TABLE IF NOT EXISTS community_stats (
  user_id      TEXT PRIMARY KEY,           -- id anonimo generato sul device
  nickname     TEXT NOT NULL DEFAULT 'Atleta',
  pb_wide      INT NOT NULL DEFAULT 0,     -- max rep in una serie
  pb_close     INT NOT NULL DEFAULT 0,
  pb_diamond   INT NOT NULL DEFAULT 0,
  pb_day       INT NOT NULL DEFAULT 0,     -- miglior totale giornaliero
  total_all    INT NOT NULL DEFAULT 0,     -- flessioni totali di sempre
  days_trained INT NOT NULL DEFAULT 0,     -- giorni allenati
  week_total   INT NOT NULL DEFAULT 0,     -- ultime 4? no: settimana corrente (lun-dom)
  streak_cur   INT NOT NULL DEFAULT 0,     -- streak attuale
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_day    ON community_stats (pb_day DESC);
CREATE INDEX IF NOT EXISTS idx_comm_total  ON community_stats (total_all DESC);
CREATE INDEX IF NOT EXISTS idx_comm_week   ON community_stats (week_total DESC);
CREATE INDEX IF NOT EXISTS idx_comm_streak ON community_stats (streak_cur DESC);
