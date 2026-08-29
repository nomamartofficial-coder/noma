# Codex execution standard

> **Status:** Binding operational standard through `AGENTS.md`
>
> **Owner:** Engineering + Product
>
> **Version:** 1.0
>
> **Activation boundary:** Every Codex task first started after `UI-006`; `UI-006` itself is grandfathered
>
> **Last model-guidance review:** 27 August 2026

## Purpose

Noma keeps its existing quality, security, architecture, testing, and review bar while spending scarce Codex capacity deliberately. Model tier and reasoning effort are execution resources. They do not change task risk, scope, acceptance criteria, required evidence, or authority.

This standard controls:

- the initial Codex model and reasoning effort selected for a task;
- when a task may escalate to a more capable or more expensive execution profile;
- how prompts and task sessions keep context bounded; and
- what execution metadata is reported for review.

It does not change the Build Pack, runtime or package architecture, delivery dependencies, task or requirement status, CI topology, release authority, or product scope.

## Activation and the UI-006 exception

`UI-006` remains governed by the model, effort, prompt, scope, dependency pins, Storybook placement, fixtures, browser tests, accessibility rules, visual baselines, and review instructions under which it began. This standard must not be used to reopen, weaken, reclassify, or expand `UI-006`, including its human-review corrections.

The first subsequent Codex implementation task, and every task after it, must use this standard. On the current dependency path that is expected to begin with `IAM-001`, but the traceability register and human-approved dependency order remain authoritative.

The activation boundary does not itself advance traceability. `UI-006` moves from `IN_REVIEW` only through the existing evidence and human-review process. `IAM-001` remains `NOT_STARTED` until its own approved task begins.

## Non-negotiable quality invariants

Changing model or effort must never be used to:

- omit acceptance criteria, negative paths, risk analysis, or required evidence;
- skip, narrow, weaken, retry away, or defer a required test or CI gate;
- weaken assertions, determinism, synthetic-fixture rules, or accessibility review;
- accept generated code, migrations, snapshots, or visual baselines without inspection;
- auto-approve visual-baseline changes or activate Chromatic or another hosted service;
- add a production Storybook route or pull future business UI into the current task;
- bypass architecture, authorization, state-machine, privacy, financial, custody, or provider boundaries;
- merge, deploy, activate a feature, or approve readiness without the existing human authority; or
- describe incomplete or unverified work as complete.

When the selected profile cannot complete the task safely, escalate the smallest unresolved part or stop with evidence. Do not lower the quality bar to fit the remaining allowance.

## Current model-routing table

Use the lowest profile that is appropriate for the task's real risk and ambiguity, not the cheapest profile that can produce plausible code. The names below are the current mapping for the GPT-5.6 family; a reviewed update is required when OpenAI changes model availability or guidance.

| Task shape | Starting model | Starting effort | Typical Noma work |
|---|---|---|---|
| Mechanical and fully specified | GPT-5.6 Luna | high | exact bookkeeping directed by an approved change, formatting, repetitive fixtures, generated-file checks, narrow documentation corrections |
| Inspection, planning, and routine diagnosis | GPT-5.6 Terra | medium | repository mapping, dependency checks, bounded implementation plans, ordinary failure triage |
| Normal implementation | GPT-5.6 Terra | high | most UI and API work, Storybook work after UI-006, ordinary tests, local refactors, deterministic tooling, conventional CI wiring |
| High-risk or cross-cutting implementation | GPT-5.6 Sol | high | authority/security boundaries, money or custody invariants, material architecture decisions, irreversible data work, ambiguous cross-module state changes |
| Exceptional rescue or verification | GPT-5.6 Sol | xhigh | a focused hard problem that remains unresolved after evidence-producing work, or a human-directed quality-first review where the marginal gain matters |

Apply these overrides:

- A task involving P0 authority, financial, custody, privacy, security, or recovery risk starts on Sol high when the affected boundary is material, even if the code diff is small.
- A routine additive migration can start on Terra high; a destructive, compatibility-sensitive, or hard-to-reverse migration uses Sol high.
- A documentation or traceability change that interprets scope, readiness, authority, or evidence is not mechanical work. Use at least Terra high, or Sol high when the decision is materially ambiguous.
- Luna is limited to work whose correct result is objectively specified and can be deterministically checked. It must not choose business policy or security posture.
- Sol xhigh is not a default for a whole task. `max`, `ultra`, or any quality-first multi-agent mode, where available, requires explicit human approval and a task-specific reason.

Official OpenAI guidance describes Sol as the frontier option, Terra as the intelligence/cost balance, Luna as the efficient high-volume option, medium reasoning as the balanced starting point, and high/xhigh reasoning as appropriate when it produces a measured quality gain. Review the current [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model) before changing this table. Do not copy volatile prices, credit rates, weekly allowances, or account-specific availability into the repository.

## Selection procedure

Before starting a post-UI-006 task:

1. Confirm the approved task, dependencies, risk class, acceptance criteria, required tests, and human reviewer.
2. Separate objectively mechanical work from work that requires product, architecture, security, or domain judgment.
3. Choose the starting profile from the table, applying the risk overrides.
4. Put a compact execution profile in the task prompt or issue.
5. Inspect first and implement only the bounded task.
6. Run the same risk-derived validation that would be required on any other model.
7. Record any escalation and return to the lower-cost profile for routine follow-through when practical.

Use this template:

```text
Codex execution profile
- Activation: POST_UI_006
- Task/risk: <task ID and risk class>
- Starting model: <model>
- Reasoning effort: <effort>
- Selection reason: <one sentence tied to task shape and risk>
- Escalation ceiling: <profile or "human approval required">
- Required gates: <unchanged task-specific commands and evidence>
```

The human starting the Codex run controls the selected model and effort. An agent may recommend an escalation, but it must not imply that a higher-cost run occurred when it did not.

## Escalation protocol

Escalation is justified when at least one of these conditions exists:

- repository evidence exposes a material ambiguity across authoritative contracts;
- a reproducible failure remains after bounded diagnosis and a focused correction attempt;
- the change crosses an architecture, migration, authorization, financial, custody, privacy, security, or recovery boundary that the starting profile cannot resolve confidently;
- verification reveals an unexplained race, data-loss risk, security gap, or correctness gap; or
- the human reviewer explicitly requests a higher-capability independent review.

Unless immediate high-risk review is required, preserve an escalation note containing:

- the exact unresolved question or failing command;
- the relevant files, contracts, and evidence already inspected;
- what was attempted and what remains uncertain;
- why a higher profile is likely to help; and
- the smallest scope to escalate.

Do not repeat an entire completed repository inspection on a second model. Escalate the hard slice, pass back the conclusion and evidence, and continue routine implementation or documentation on the starting profile where practical.

Deadline pressure, a desire for a longer answer, a slow deterministic test, or a nearly exhausted allowance is not by itself an escalation reason. A higher profile also does not substitute for missing product authority or human approval.

## Context and session discipline

- Use one bounded task and one focused branch per implementation cycle.
- Start a fresh Codex task when the objective changes materially; do not carry unrelated repository history indefinitely.
- Point to committed authority by path and section instead of pasting the complete Build Pack into every prompt.
- State each constraint once. Include the task ID, objective, in/out of scope, dependencies, risk, acceptance, required commands, evidence, and stop conditions.
- Reuse established public interfaces, fixtures, validators, and commands discovered during inspection.
- Read changed or governing files deliberately; do not repeatedly inventory the whole repository after the relevant boundary is known.
- Use deterministic tools for mechanical comparison, validation, counting, formatting, and fixture generation.
- Do not launch duplicate full-task attempts on several models. Independent review is targeted and evidence-driven.
- End a run after the bounded implementation, verification, diff review, and final report. Do not spend remaining capacity on speculative polish or future scope.

If capacity ends mid-task, leave a truthful checkpoint: current branch and commit, files changed, commands and results, unresolved failures, next exact action, and any assumptions. Do not merge partial work, mark the task complete, or reduce validation to force closure.

## Testing and CI independence

The test matrix comes from the task risk and `docs/11-testing-strategy.md`, not the model tier. The local commands in `TESTING.md`, the stable gates in `CI.md`, and all task-specific browser, accessibility, security, integration, migration, concurrency, and UAT obligations remain unchanged.

CI must remain deterministic and provider-safe. It must not call an LLM, depend on a Codex account or allowance, transmit repository code to a model, or vary a required gate according to the authoring profile. Execution-profile metadata is review context, not a pass/fail substitute.

## Review and reporting

For each post-UI-006 task, the final agent report and pull-request description must state:

- starting model and reasoning effort;
- any escalation, its bounded reason, and the unresolved slice it addressed;
- whether capacity caused an incomplete checkpoint;
- exact validation performed and anything not run; and
- confirmation that scope, architecture, traceability, tests, CI, and review authority were not relaxed for the selected profile.

Reviewers assess the resulting diff and evidence, not the prestige of the model. A Sol xhigh result receives no presumption of correctness; a Terra or Luna result receives no reduced acceptance bar.

Review this routing table when a named model is retired, official guidance materially changes, or representative Noma tasks show a measured quality/cost mismatch. Update this document through a bounded, human-reviewed governance change. Do not silently change the operating strategy inside an implementation prompt.
