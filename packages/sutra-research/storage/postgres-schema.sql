-- Local/hosted research persistence candidate. Apply using a trusted migration role.
-- Application and worker DB credentials are trusted server-side capabilities.
CREATE SCHEMA IF NOT EXISTS sutra_research;
CREATE TABLE IF NOT EXISTS sutra_research.tenant_limits (
 tenant_id text PRIMARY KEY CHECK (length(tenant_id) BETWEEN 1 AND 128),
 max_active integer NOT NULL CHECK (max_active BETWEEN 1 AND 100),
 max_session_cost_micros bigint NOT NULL CHECK (max_session_cost_micros BETWEEN 1 AND 1000000),
 max_daily_cost_micros bigint NOT NULL CHECK (max_daily_cost_micros BETWEEN 1 AND 1000000000)
);
CREATE TABLE IF NOT EXISTS sutra_research.daily_reservations (
 tenant_id text NOT NULL REFERENCES sutra_research.tenant_limits(tenant_id),
 day date NOT NULL,
 reserved_cost_micros bigint NOT NULL CHECK (reserved_cost_micros >= 0),
 PRIMARY KEY (tenant_id,day)
);
CREATE TABLE IF NOT EXISTS sutra_research.sessions (
 session_id text PRIMARY KEY CHECK (session_id ~ '^research_[0-9a-f-]{36}$'),
 tenant_id text NOT NULL REFERENCES sutra_research.tenant_limits(tenant_id),
 owner_id text NOT NULL CHECK (length(owner_id) BETWEEN 1 AND 128),
 plan_pin text NOT NULL CHECK (plan_pin ~ '^sha256:[0-9a-f]{64}$'),
 manifest_text text NOT NULL CHECK (octet_length(manifest_text) BETWEEN 1 AND 16384),
 model_disclosure_approved boolean NOT NULL,
 reserved_cost_micros bigint NOT NULL CHECK (reserved_cost_micros BETWEEN 1 AND 1000000),
 state text NOT NULL CHECK (state IN ('queued','running','closed','cancelled','expired','reconciliation_required','failed')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 deadline timestamptz NOT NULL,
 lease_token uuid,
 lease_expires_at timestamptz,
 generation integer NOT NULL DEFAULT 0 CHECK (generation >= 0),
 checkpoint_revision integer NOT NULL DEFAULT 0 CHECK (checkpoint_revision >= 0),
 checkpoint_sequence integer NOT NULL DEFAULT 0 CHECK (checkpoint_sequence >= 0),
 checkpoint_text text CHECK (octet_length(checkpoint_text) <= 33554432),
 checkpoint_pin text CHECK (checkpoint_pin IS NULL OR checkpoint_pin ~ '^sha256:[0-9a-f]{64}$'),
 checkpoint_state text CHECK (checkpoint_state IS NULL OR checkpoint_state IN ('running','closed','paused')),
 checkpoint_pending boolean NOT NULL DEFAULT false,
 report_text text CHECK (octet_length(report_text) <= 33554432),
 report_pin text CHECK (report_pin IS NULL OR report_pin ~ '^sha256:[0-9a-f]{64}$'),
 failure_code text,
 CHECK ((state='running') = (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
 CHECK ((state='closed') = (report_text IS NOT NULL AND report_pin IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS research_queue_order ON sutra_research.sessions(created_at,session_id) WHERE state='queued';
CREATE INDEX IF NOT EXISTS research_owner ON sutra_research.sessions(tenant_id,owner_id,created_at);
CREATE INDEX IF NOT EXISTS research_running_lease ON sutra_research.sessions(lease_expires_at) WHERE state='running';
CREATE TABLE IF NOT EXISTS sutra_research.events (
 session_id text NOT NULL REFERENCES sutra_research.sessions(session_id) ON DELETE CASCADE,
 sequence integer NOT NULL CHECK (sequence BETWEEN 1 AND 100000),
 event jsonb NOT NULL CHECK (jsonb_typeof(event)='object'),
 PRIMARY KEY (session_id,sequence)
);
-- No public grants. A deployment must provision restricted server roles separately.
REVOKE ALL ON SCHEMA sutra_research FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA sutra_research FROM PUBLIC;
