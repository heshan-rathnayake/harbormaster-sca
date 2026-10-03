#!/usr/bin/env bash
# Runs once, when the Postgres volume is first created. One schema and one
# role per service (ADR 003). To apply changes, run `task reset`.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v api_pw="$HM_API_DB_PASSWORD" \
  -v findings_pw="$HM_FINDINGS_DB_PASSWORD" \
  -v triage_pw="$HM_TRIAGE_DB_PASSWORD" <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;

CREATE ROLE hm_api      LOGIN PASSWORD :'api_pw';
CREATE ROLE hm_findings LOGIN PASSWORD :'findings_pw';
CREATE ROLE hm_triage   LOGIN PASSWORD :'triage_pw';

-- Prisma Migrate creates a temporary shadow database while developing.
ALTER ROLE hm_api CREATEDB;

CREATE SCHEMA core     AUTHORIZATION hm_api;
CREATE SCHEMA matching AUTHORIZATION hm_findings;
CREATE SCHEMA triage   AUTHORIZATION hm_triage;

ALTER ROLE hm_api      SET search_path = core;
ALTER ROLE hm_findings SET search_path = matching;
ALTER ROLE hm_triage   SET search_path = triage;

-- The API reads other services' data only through views; each owning
-- service grants SELECT on its views in its own migrations.
GRANT USAGE ON SCHEMA matching, triage TO hm_api;
SQL
