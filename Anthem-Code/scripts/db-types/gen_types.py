"""Generate anthem + shared schema types and splice them into the Supabase-generated public types.

Usage (see README.md):
  python3 gen_types.py catalog.json public_types.ts ../../src/integrations/supabase/types.generated.ts
"""
import json, re, sys
cat_file, pub_types, out = sys.argv[1], sys.argv[2], sys.argv[3]
raw = open(cat_file).read().strip()
if raw.startswith('['):
    rows = json.loads(raw)  # plain JSON array from `psql -At -f catalog.sql`
else:
    outer = json.loads(raw)
    s = outer['result'] if isinstance(outer, dict) else raw
    m = re.search(r'\[\{"json_agg":(\[.*\])\}\]', s, re.S)
    rows = json.loads(m.group(1))
pub = open(pub_types).read()
enum_names = set(re.findall(r'^      (\w+):\s*\n?\s*\|?\s*"', pub[pub.index('    Enums: {'):], re.M))

def ts(r):
    dt, udt = r['dt'], r['udt']
    base = udt[1:] if dt == 'ARRAY' else udt
    scalar = {
        'text':'string','varchar':'string','bpchar':'string','uuid':'string','citext':'string','inet':'string',
        'date':'string','timestamp':'string','timestamptz':'string','time':'string','timetz':'string','interval':'string',
        'int2':'number','int4':'number','int8':'number','numeric':'number','float4':'number','float8':'number',
        'bool':'boolean','json':'Json','jsonb':'Json','vector':'string','bytea':'string','tsvector':'unknown',
    }.get(base)
    if scalar is None:
        scalar = f'Database["public"]["Enums"]["{base}"]' if base in enum_names else 'unknown'
    return f'{scalar}[]' if dt == 'ARRAY' else scalar

from collections import OrderedDict
schemas = OrderedDict()
for r in rows:
    schemas.setdefault(r['sch'], OrderedDict()).setdefault((r['tbl'], r['kind']), []).append(r)

def block(cols, mode):
    lines = []
    for c in cols:
        t = ts(c) + (' | null' if c['nul'] else '')
        if mode == 'Row':
            lines.append(f'          {c["col"]}: {t}')
        elif mode == 'Insert':
            if c['gen']:
                lines.append(f'          {c["col"]}?: never')
            else:
                opt = '?' if (c['nul'] or c['has_def']) else ''
                lines.append(f'          {c["col"]}{opt}: {t}')
        else:
            lines.append(f'          {c["col"]}?: ' + ('never' if c['gen'] else t))
    return '\n'.join(lines)

parts = []
for sch, tables in schemas.items():
    t_out, v_out = [], []
    for (tbl, kind), cols in sorted(tables.items()):
        if kind == 'VIEW':
            v_out.append(f'      {tbl}: {{\n        Row: {{\n{block(cols,"Row")}\n        }}\n        Relationships: []\n      }}')
        else:
            t_out.append(f'      {tbl}: {{\n        Row: {{\n{block(cols,"Row")}\n        }}\n        Insert: {{\n{block(cols,"Insert")}\n        }}\n        Update: {{\n{block(cols,"Update")}\n        }}\n        Relationships: []\n      }}')
    parts.append(f'  {sch}: {{\n    Tables: {{\n' + '\n'.join(t_out) + '\n    }\n    Views: {\n' + '\n'.join(v_out) + '\n    }\n    Functions: {\n      [_ in never]: never\n    }\n    Enums: {\n      [_ in never]: never\n    }\n    CompositeTypes: {\n      [_ in never]: never\n    }\n  }')

# splice extra schemas into Database right after "export type Database = {" internal block
idx = pub.index('  public: {')
merged = pub[:idx] + '\n'.join(parts) + '\n' + pub[idx:]
open(out, 'w').write(merged)
print({k: len(v) for k, v in schemas.items()})
