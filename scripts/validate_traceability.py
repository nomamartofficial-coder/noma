#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, copy, gzip, json, re, sys
from pathlib import Path
from collections import defaultdict
ROOT=Path(__file__).resolve().parents[1]
TR=ROOT/'delivery'/'traceability'
DOCS=ROOT/'docs'
class ValidationError(Exception): pass

def load_ndjson(pattern):
    rows=[]
    paths=sorted(TR.glob(pattern))
    if not paths: raise ValidationError(f'no files match {pattern}')
    for path in paths:
        try:
            if path.name.endswith('.ndjson.gz.b64'):
                encoded=''.join(path.read_text(encoding='ascii').split())
                raw=gzip.decompress(base64.b64decode(encoded, validate=True)).decode('utf-8')
            else:
                raw=path.read_text(encoding='utf-8')
        except (ValueError, OSError, UnicodeError) as e:
            raise ValidationError(f'{path.name}: cannot decode register: {e}')
        for n,line in enumerate(raw.splitlines(),1):
            if not line.strip(): continue
            try: rows.append(json.loads(line))
            except json.JSONDecodeError as e: raise ValidationError(f'{path.name}:{n}: invalid JSON: {e}')
    return rows

def unique_ids(rows,label):
    ids=[x.get('id') for x in rows]
    if any(not x for x in ids): raise ValidationError(f'{label}: missing ID')
    seen=set(); dup=[]
    for x in ids:
        if x in seen: dup.append(x)
        seen.add(x)
    if dup: raise ValidationError(f'{label}: duplicate IDs {sorted(set(dup))[:10]}')
    return set(ids)

def slug(s): return re.sub(r'[^A-Z0-9]+','-',s.upper().replace('&',' AND ')).strip('-')

def canonical_refs(tasks):
    refs={}
    refs['documents']={f'DOC-{i:02d}' for i in range(14)}|{'DOC-AGENTS','DOC-README'}
    text=(DOCS/'02-user-roles.md').read_text(encoding='utf-8'); names=[]; active=False
    for line in text.splitlines():
        if line.startswith('## 12. Role templates'): active=True; continue
        if active and line.startswith('## 13.'): break
        if active:
            m=re.match(r'^\| ([A-Za-z][^|]+?) \|',line)
            if m:
                name=m.group(1).strip()
                if name!='Role/template' and not name.startswith('-'): names.append(name)
    names += ['Founder','Product','Engineering','QA','DevOps','Design','Operations','Support','Finance','Trust and Safety','Security','Privacy','Legal','Partnership','Logistics','Release','Catalogue','Access Administration','Human Reviewer','Codex Agent']
    refs['roles']={'ROLE:'+slug(x) for x in names}
    text=(DOCS/'03-user-journeys.md').read_text(encoding='utf-8')
    refs['journeys']=set(re.findall(r'^##\s+\d+\.\s+`(J\d{2})`\s+—',text,re.M))
    text=(DOCS/'04-information-architecture.md').read_text(encoding='utf-8')
    refs['routes']={'ROUTE:'+x for x in re.findall(r'`(/[^`\s]*)`',text)}
    text=(DOCS/'06-technical-architecture.md').read_text(encoding='utf-8'); modules=[]; active=False
    for line in text.splitlines():
        if line.startswith('## 12. Core module map'): active=True; continue
        if active and line.startswith('### 12.1'): break
        if active:
            m=re.match(r'^\| ([A-Za-z][A-Za-z &-]+) \|',line)
            if m and m.group(1)!='Module': modules.append(m.group(1).strip())
    modules += ['Food','External Inbound','FBN Campus','Pre-Owned','Priority Delivery','Saver Batching','Repository Governance','Platform Foundation','UI System','Quality','Security and Compliance','Observability','Infrastructure','Release and Readiness']
    refs['modules']={'MODULE:'+x for x in modules}
    text=(DOCS/'07-domain-model.md').read_text(encoding='utf-8')
    refs['entities']={'ENTITY:'+x for x in re.findall(r'^\| `([a-z][a-z0-9_]+)` \|',text,re.M)}
    text=(DOCS/'08-state-machines.md').read_text(encoding='utf-8')
    refs['machines']=set(re.findall(r'^\| `(M\d{2})` \|',text,re.M))
    task_ids={t['id'] for t in tasks}
    refs['tests']={'TEST-'+x for x in task_ids}; refs['evidence']={'EVID-'+x for x in task_ids}
    return refs

def build_reverse(tasks):
    reverse=defaultdict(list)
    for t in tasks:
        reverse[t['id']].append(t['id'])
        for req in t['requirement_refs']: reverse[req].append(t['id'])
        for rel in t['relations'].values():
            for ref in rel['refs']: reverse[ref].append(t['id'])
    return {k:sorted(set(v)) for k,v in reverse.items()}

def validate(bundle=None):
    tasks=load_ndjson('task-register-*.ndjson.gz.b64') if bundle is None else bundle['tasks']
    reqs=load_ndjson('requirement-register-*.ndjson.gz.b64') if bundle is None else bundle['requirements']
    decs=load_ndjson('decision-register.ndjson') if bundle is None else bundle['decisions']
    if len(tasks)!=152: raise ValidationError(f'expected 152 tasks, found {len(tasks)}')
    if sum(t['priority']=='P0' for t in tasks)!=141: raise ValidationError('expected 141 P0 tasks')
    task_ids=unique_ids(tasks,'tasks'); req_ids=unique_ids(reqs,'requirements'); dec_ids=unique_ids(decs,'decisions')
    refs=canonical_refs(tasks)
    task_map={t['id']:t for t in tasks}
    required_rel=['scope_decisions','roles','journeys','routes','modules','entities','machines','tests','evidence']
    rel_catalog={'roles':'roles','journeys':'journeys','routes':'routes','modules':'modules','entities':'entities','machines':'machines','tests':'tests','evidence':'evidence'}
    for t in tasks:
        if set(t['relations'])!=set(required_rel): raise ValidationError(f'{t["id"]}: incomplete relation categories')
        for dep in t['depends_on']:
            if dep not in task_ids: raise ValidationError(f'{t["id"]}: unknown dependency {dep}')
        for src in t['source_refs']:
            if src not in refs['documents']: raise ValidationError(f'{t["id"]}: unknown source {src}')
        for rid in t['requirement_refs']:
            if rid not in req_ids: raise ValidationError(f'{t["id"]}: unknown requirement {rid}')
        for category,rel in t['relations'].items():
            if rel['status']=='MAPPED' and not rel['refs']: raise ValidationError(f'{t["id"]}: {category} mapped without refs')
            if rel['status']=='NOT_APPLICABLE' and (rel['refs'] or not rel.get('reason')): raise ValidationError(f'{t["id"]}: invalid N/A for {category}')
            if rel['status'] not in ('MAPPED','NOT_APPLICABLE'): raise ValidationError(f'{t["id"]}: bad relation status')
            allowed=dec_ids if category=='scope_decisions' else refs[rel_catalog[category]]
            for ref in rel['refs']:
                if ref not in allowed: raise ValidationError(f'{t["id"]}: unknown {category} reference {ref}')
        if t['priority']=='P0':
            for category in ('scope_decisions','roles','tests','evidence'):
                if not t['relations'][category]['refs']: raise ValidationError(f'{t["id"]}: P0 {category} missing')
    for r in reqs:
        for tid in r['task_refs']:
            if tid not in task_ids or r['id'] not in task_map[tid]['requirement_refs']: raise ValidationError(f'{r["id"]}: broken task backlink {tid}')
        for did in r['decision_refs']:
            if did not in dec_ids: raise ValidationError(f'{r["id"]}: unknown decision {did}')
        for ref in r['test_refs']:
            if ref not in refs['tests']: raise ValidationError(f'{r["id"]}: unknown test {ref}')
        for ref in r['evidence_refs']:
            if ref not in refs['evidence']: raise ValidationError(f'{r["id"]}: unknown evidence {ref}')
    for d in decs:
        expected=sorted(t['id'] for t in tasks if d['id'] in t['relations']['scope_decisions']['refs'])
        if sorted(d['task_refs'])!=expected: raise ValidationError(f'{d["id"]}: stale task backlinks')
        expected_req=sorted(r['id'] for r in reqs if d['id'] in r['decision_refs'])
        if sorted(d['requirement_refs'])!=expected_req: raise ValidationError(f'{d["id"]}: stale requirement backlinks')
    return {'tasks':len(tasks),'p0':sum(t['priority']=='P0' for t in tasks),'requirements':len(reqs),'decisions':len(decs),'reverse':build_reverse(tasks)}

def self_test():
    bundle={'tasks':copy.deepcopy(load_ndjson('task-register-*.ndjson.gz.b64')),'requirements':load_ndjson('requirement-register-*.ndjson.gz.b64'),'decisions':load_ndjson('decision-register.ndjson')}
    bundle['tasks'][0]['relations']['roles']['refs'].append('ROLE:UNKNOWN-INJECTED')
    try: validate(bundle)
    except ValidationError as e:
        if 'unknown roles reference' in str(e): return
        raise ValidationError(f'negative test failed for wrong reason: {e}')
    raise ValidationError('negative test failed: injected unknown reference was accepted')

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--self-test',action='store_true'); ap.add_argument('--lookup'); args=ap.parse_args()
    try:
        result=validate()
        if args.self_test: self_test()
    except (ValidationError,KeyError,TypeError) as e:
        print(f'FAIL: {e}',file=sys.stderr); return 1
    print(f'PASS: {result["tasks"]} tasks ({result["p0"]} P0), {result["requirements"]} requirements, {result["decisions"]} decisions')
    if args.self_test: print('PASS: injected unknown reference was rejected')
    if args.lookup:
        found=result['reverse'].get(args.lookup,[])
        print(f'LOOKUP {args.lookup}: {", ".join(found) if found else "no task references"}')
    return 0
if __name__=='__main__': raise SystemExit(main())
