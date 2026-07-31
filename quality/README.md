# Quality Records

**Primary owner:** QA  
**Required reviewers:** Engineering and Product  
**Authority:** `docs/11-testing-strategy.md` and `docs/12-delivery-backlog.md`

Use this directory for release-linked quality metadata: test summaries, requirement coverage, concurrency/property outcomes, accessibility, performance, compatibility, UAT, and defect evidence.

Do not commit secrets, raw production payloads, private customer material, identity files, bank data, or unredacted screenshots. Store large/raw artefacts in an approved evidence system and commit only sanitised metadata and links.

Every record must identify the exact commit, release/environment, owner role, performed date, expiry or revalidation date, result, known limitations, related defects, and evidence links. A passing summary does not override a failed critical test or gate.
