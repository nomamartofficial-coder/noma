# Noma Traceability Registers

> **Task:** FND-007  
> **Status:** Repository foundation  
> **Authority:** `docs/12-delivery-backlog.md`  
> **Risk:** `P0-RECOVERY`

## Purpose

These registers make Noma's delivery claims traceable in both directions. A task points to its governing requirement, decisions, roles, journeys, routes, modules, entities, state machines, planned tests, and evidence obligation. `reverse-index.json` provides the inverse lookup from each reference back to affected tasks.

The first baseline contains all **150** backlog tasks, including **139 P0 tasks**. Each task has one canonical delivery-acceptance requirement, one planned verification obligation, and one planned evidence obligation.

## Files

- `task-register.json` — all backlog tasks, dependencies, status, and forward traceability.
- `requirement-register.json` — one canonical acceptance requirement per task, with task/decision/test/evidence back-links.
- `decision-register.json` — the 15 locked scope decisions plus repository, architecture, quality, and readiness decisions.
- `reference-catalog.json` — canonical IDs for documents, roles, journeys, routes, modules, entities, machines, test obligations, and evidence obligations.
- `reverse-index.json` — generated reverse lookups from every reference category to tasks.
- `manifest.json` — versions, counts, files, and validation commands.
- `schemas/*.schema.json` — machine-readable structural contracts.
- `scripts/validate_traceability.py` — zero-dependency referential validator and negative self-test.

## Mapping status

Every relation has one of:

- `MAPPED` — one or more canonical references are recorded;
- `NOT_APPLICABLE` — the relation does not apply and a reason is mandatory.

A `PLANNED` test or evidence node is an obligation only. It must never be presented as proof that a command ran, a test passed, UAT occurred, or a readiness gate passed.

## Validation

```bash
python scripts/validate_traceability.py
python scripts/validate_traceability.py --self-test
```

The validator fails on:

- duplicate IDs;
- unknown task dependencies;
- unknown document, decision, role, journey, route, module, entity, machine, test, or evidence references;
- missing P0 traceability categories;
- empty `NOT_APPLICABLE` reasons;
- broken requirement-to-task or decision-to-task back-links;
- stale or inconsistent reverse indexes; and
- a negative test that fails to detect an injected unknown reference.

## Update rule

Every task PR must update the applicable records when it changes scope, requirements, dependencies, roles, journeys, routes, modules, entities, machines, tests, evidence, status, or decision impact. Do not hand-edit `reverse-index.json` without regenerating or validating it against the forward records.

Unknown or ambiguous references must be resolved through the governing document or scope-change process. Do not invent IDs merely to make validation pass.
