-- Reference copy of the schema; lib/db.ts applies it automatically (idempotent).
CREATE TABLE IF NOT EXISTS orders (
  id           BIGSERIAL PRIMARY KEY,
  external_id  TEXT UNIQUE NOT NULL,          -- Grow transaction id (or "manual:<uuid>")
  email        TEXT,
  amount_agorot INTEGER,
  source       TEXT NOT NULL DEFAULT 'grow',   -- 'grow' | 'manual'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credits (
  token       TEXT PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id),
  status      TEXT NOT NULL DEFAULT 'available', -- available | in_progress | done
  started_at  TIMESTAMPTZ,
  report_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_token TEXT NOT NULL REFERENCES credits(token),
  input_url   TEXT NOT NULL,
  report      JSONB NOT NULL,
  usage       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grow_events (
  id          BIGSERIAL PRIMARY KEY,
  payload     JSONB NOT NULL,
  handled     BOOLEAN NOT NULL DEFAULT false,
  note        TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
