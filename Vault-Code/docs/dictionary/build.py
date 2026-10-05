#!/usr/bin/env python3
"""Build + validate the Vault Engine dictionary.
Usage: python3 docs/dictionary/build.py   (reads src/*.txt, writes dictionary.json)
Source format (edit the .txt files, never the JSON):
  @domain code | th | en
  @group name | th | en | maxPerImage (blank = unlimited)
  term_id | th1,th2 | en1,en2 | parent_term_id (optional, same group)
Ids become '<code>.<name>'. Hierarchy: domain > group > term > child term."""
import glob, json, os, sys, collections

here = os.path.dirname(os.path.abspath(__file__))
domains, errors = [], []
ids, syn_global = set(), collections.defaultdict(set)
total_terms = 0

def split(s): return [x.strip() for x in s.split(',') if x.strip()]

for path in sorted(glob.glob(os.path.join(here, 'src', '*.txt'))):
    dom, grp = None, None
    for n, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.strip()
        if not line or line.startswith('#'): continue
        where = f'{os.path.basename(path)}:{n}'
        if line.startswith('@domain'):
            p = [x.strip() for x in line[7:].split('|')]
            dom = {'code': p[0], 'th': p[1], 'en': p[2], 'groups': []}
            domains.append(dom); continue
        if line.startswith('@group'):
            p = [x.strip() for x in line[6:].split('|')]
            mx = int(p[3]) if len(p) > 3 and p[3] else None
            grp = {'id': f"{dom['code']}.{p[0]}", 'th': p[1], 'en': p[2], 'maxPerImage': mx, 'terms': []}
            dom['groups'].append(grp); continue
        p = [x.strip() for x in line.split('|')]
        if len(p) < 3: errors.append(f'{where}: bad line'); continue
        tid = f"{dom['code']}.{p[0]}"
        if tid in ids: errors.append(f'{where}: duplicate id {tid}')
        ids.add(tid)
        term = {'id': tid, 'th': split(p[1]), 'en': split(p[2])}
        if len(p) > 3 and p[3]: term['parent'] = f"{dom['code']}.{p[3]}"
        if not term['th'] or not term['en']: errors.append(f'{where}: empty th/en for {tid}')
        grp['terms'].append(term); total_terms += 1

# overlays: src/extra/*.txt  ->  "@dom code" then "short_id | extra en | extra th" (either side may be empty)
# Adds designer jargon, abbreviations, slang and Thai-script loanword spellings to EXISTING terms.
# The first en synonym stays the display label; extras are appended.
by_id = {t['id']: t for d in domains for g in d['groups'] for t in g['terms']}
extra_count = 0
for path in sorted(glob.glob(os.path.join(here, 'src', 'extra', '*.txt'))):
    code = None
    for n, raw in enumerate(open(path, encoding='utf-8'), 1):
        line = raw.strip()
        if not line or line.startswith('#'): continue
        where = f'extra/{os.path.basename(path)}:{n}'
        if line.startswith('@dom'): code = line[4:].strip(); continue
        p = [x.strip() for x in line.split('|')]
        tid = f'{code}.{p[0]}'
        if tid not in by_id: errors.append(f'{where}: unknown term {tid}'); continue
        t = by_id[tid]
        for lst, idx in ((t['en'], 1), (t['th'], 2)):
            if len(p) > idx:
                for s in split(p[idx]):
                    if s.lower() not in {x.lower() for x in lst}: lst.append(s); extra_count += 1

# validation
for d in domains:
    for g in d['groups']:
        local = {t['id'] for t in g['terms']}
        seen = {}
        for t in g['terms']:
            if 'parent' in t:
                if t['parent'] not in local: errors.append(f"{t['id']}: parent {t['parent']} not in group {g['id']}")
                if t['parent'] == t['id']: errors.append(f"{t['id']}: self parent")
            for s in t['th'] + t['en']:
                k = s.lower()
                if k in seen and seen[k] != t['id']: errors.append(f"{g['id']}: synonym '{s}' on {seen[k]} and {t['id']}")
                seen[k] = t['id']
                syn_global[k].add(t['id'])
        # cycle / depth check
        par = {t['id']: t.get('parent') for t in g['terms']}
        for tid in par:
            depth, cur = 0, tid
            while par.get(cur):
                cur = par[cur]; depth += 1
                if depth > 3: errors.append(f'{tid}: hierarchy too deep or cyclic'); break

cross = {k: sorted(v) for k, v in syn_global.items() if len({i.split('.')[0] for i in v}) > 1}
out = {'version': 1, 'domains': domains}
json.dump(out, open(os.path.join(here, 'dictionary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
groups = sum(len(d['groups']) for d in domains)
print(f'domains={len(domains)} groups={groups} terms={total_terms} extra_synonyms={extra_count} errors={len(errors)} cross_domain_synonyms={len(cross)}')
for e in errors: print('ERROR', e)
if '--cross' in sys.argv:
    for k, v in sorted(cross.items()): print('CROSS', k, v)
sys.exit(1 if errors else 0)
