# Noma Traceability Registers

> **Task:** `FND-007`  
> **Risk:** `P0-RECOVERY`  
> **Authority:** `docs/12-delivery-backlog.md`

## Purpose

The registers provide a machine-readable path from each delivery task to its governing acceptance requirement, locked decisions, roles, journeys, routes, modules, entities, state machines, planned tests, and evidence obligation. The same data can be queried backward from any reference to every affected task.

The baseline contains all **150** backlog tasks, including all **139 P0 tasks**. Each task has one canonical acceptance requirement, one planned verification obligation, and one planned evidence obligation.

## Files

- `task-register-01.ndjson.gz.b64` through `task-register-03.ndjson.gz.b64` — one logical task register containing task metadata, dependencies, status, and forward traceability.
- `requirement-register-01.ndjson.gz.b64` and `requirement-register-02.ndjson.gz.b64` — one logical requirement register containing acceptance requirements with task, decision, test, and evidence back-links.
- `decision-register.ndjson` — 15 locked scope decisions plus repository, architecture, quality, and readiness decisions with reverse task/requirement links.
- `task-index.csv` — plain-text summary of all 150 tasks.
- `requirement-index-01.csv` through `requirement-index-03.csv` — plain-text summaries of all 150 acceptance requirements.
- `manifest.json` — counts, version, files, and validation commands.
- `schemas/*.schema.json` — JSON Schema contracts for each record type.
- `scripts/validate_traceability.py` — zero-dependency structural, source, forward/backward, and referential validator.

The detailed task and requirement NDJSON shards are gzip-compressed and base64-wrapped because of repository-connector write limits. This is deterministic transport, **not encryption**. The validator decodes them in memory before validating. The plain CSV indexes remain directly diffable and reviewable.

## Relation status

- `MAPPED` means one or more canonical references are recorded.
- `NOT_APPLICABLE` means the category does not apply and a reason is mandatory.

A test or evidence reference is an obligation, not proof that a command ran, a test passed, UAT occurred, or a readiness gate passed.

## Commands

```bash
python scripts/validate_traceability.py
python scripts/validate_traceability.py --self-test
python scripts/validate_traceability.py --lookup FND-007
python scripts/validate_traceability.py --lookup J05
python scripts/validate_traceability.py --lookup DEC-SCOPE-006
```

Validation fails on:

- duplicate IDs;
- unknown task dependencies;
- unknown document, decision, role, journey, route, module, entity, machine, test, or evidence references;
- missing mandatory P0 traceability;
- empty `NOT_APPLICABLE` reasons;
- broken requirement-to-task or decision-to-task back-links; or
- failure to reject the deliberately injected unknown reference in the negative self-test.

## Update rule

Every task PR must update applicable records when it changes scope, requirements, dependencies, roles, journeys, routes, modules, entities, machines, tests, evidence, status, or decision impact. Unknown or ambiguous references must be resolved from the governing documents or through approved scope change. Do not invent IDs merely to make validation pass.
