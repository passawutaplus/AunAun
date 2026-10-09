#!/bin/bash
# Local test of the 20261007* review migrations on a THROWAWAY Postgres (no Supabase Pro branch needed).
# Usage:  PGPORT=54329 ./run_all.sh      (needs a scratch cluster: initdb -D <dir> --auth=trust; pg_ctl -o "-p 54329" start)
# Never point this at a real database: it drops and recreates database "rt".
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; MIG="$HERE/../../migrations"; PORT="${PGPORT:-54329}"
P() { psql -h 127.0.0.1 -p "$PORT" -U postgres -q "$@"; }
P -c "drop database if exists rt" -c "create database rt" 2>/dev/null
(cd "$HERE/../../../../Anthem-Code" && npx tsx "$HERE/oracle.ts") > "$HERE/oracle.generated.sql"   # expected money values from the REAL fees.ts
for f in bootstrap.sql create_report.sql oracle.generated.sql; do P -d rt -v ON_ERROR_STOP=1 -f "$HERE/$f" 2>&1 | grep -v -e WARNING -e HINT; done
P -d rt -f "$HERE/before.sql" >/dev/null 2>&1
P -d rt -c "create table t.before as select * from t.results" -c "delete from t.results" -c "delete from shared.hire_orders" -c "delete from anthem.forum_attachments" -c "delete from anthem.projects" -c "delete from shared.messages" -c "delete from shared.conversation_members" -c "delete from shared.admin_audit_log"
for f in 20261007200000_aplus1_lock_scan_status_and_counters 20261007201000_aplus1_hire_order_server_money 20261007202000_aplus1_restore_user_reports 20261007203000_aplus1_unsend_message 20261009100000_aplus1_messages_lock_update 20261009110000_aplus1_kyc_private_bucket 20261009120000_aplus1_admin_helpers_and_grants; do P -d rt -v ON_ERROR_STOP=1 -f "$MIG/$f.sql" 2>&1 | grep ERROR; done
P -d rt -f "$HERE/after.sql" 2>&1 | grep -E "ERROR|MISMATCH"
echo "--- BEFORE (PASS = problem reproduced)"; P -d rt -tA -F' | ' -c "select case when pass then 'PASS' else 'FAIL' end, name from t.before"
echo "--- AFTER"; P -d rt -tA -c "select count(*) filter (where pass)||' pass / '||count(*) filter (where not pass)||' fail of '||count(*) from t.results"
P -d rt -tA -F' | ' -c "select 'FAIL', name, detail from t.results where not pass"
