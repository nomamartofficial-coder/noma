# Release and Readiness Evidence

**Primary owner:** QA  
**Required reviewers:** Security, Release, and the relevant gate owner  
**Authority:** `docs/11-testing-strategy.md`, `docs/12-delivery-backlog.md`, and `docs/13-covenant-pilot-readiness.md`

This directory stores version-controlled evidence metadata and safe links. It must not contain production secrets, raw identity documents, bank data, private case content, private messages, real customer contact details, or unrestricted provider payloads.

Every evidence item must include:

- requirement and task references;
- readiness gate and risk class;
- exact commit SHA and release ID;
- environment and provider environment where applicable;
- owner and independent verifier roles;
- performed date and expiry/revalidation date;
- result, limitations, defects, and redaction review;
- safe artefact links;
- retention classification; and
- supersession history.

`PASS` is valid only for the exact release/environment tested and expires after material changes or the recorded expiry. Screenshots may supplement evidence but do not prove backend, provider, financial, custody, or authorization truth alone.

DEV-008 GitHub Actions artefacts carry bounded CI result manifests, JUnit, and coverage evidence for 90 days. Repository records remain the durable index. The CI-specific schema is `evidence/schemas/ci-evidence-manifest.schema.json`; generated manifests remain ignored and are uploaded only after credential-safe validation. Artifact attestations and immutable releases remain future release-hardening controls because DEV-008 creates no deployable artifact.
