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

GitHub Actions artefacts may later carry large build/test outputs with explicit retention, while repository records remain the durable index. Artifact attestations and immutable releases are future release-hardening controls, not claims established by this foundation task.
