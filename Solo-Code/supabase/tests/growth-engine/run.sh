#!/bin/bash
# Local test of the DRAFT growth migration on a THROWAWAY Postgres 17 (never a real database).
# Usage:  PGPORT=54329 ./run.sh   (needs a scratch cluster: initdb -D <dir> --auth=trust; pg_ctl -o "-p 54329" start)
# It drops and recreates database "ge_test". Every line should read "ok: ..."; any ERROR/FAILED is a bug.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; MIG="$HERE/../../migrations/20261120100000_growth_engine_schema.sql"; PORT="${PGPORT:-54329}"
P() { psql -h 127.0.0.1 -p "$PORT" -U postgres -q "$@"; }
P -c "drop database if exists ge_test" -c "create database ge_test" >/dev/null 2>&1
P -c "do \$\$ begin create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; exception when duplicate_object then null; end \$\$" >/dev/null 2>&1
P -d ge_test -v ON_ERROR_STOP=1 -f "$HERE/stubs.sql" 2>&1 | grep -E "ERROR" | grep -v "already exists"
P -d ge_test -v ON_ERROR_STOP=1 -f "$MIG" 2>&1 | grep ERROR
P -d ge_test -v ON_ERROR_STOP=1 -f "$MIG" 2>&1 | grep ERROR   # applying twice must be safe
P -d ge_test -f "$HERE/behaviour.sql" 2>&1 | grep -E "ok:|ERROR|FAILED|wrong error|expected error" | sed 's/^.*NOTICE:  //'
