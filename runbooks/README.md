# Operational Runbooks

**Primary owner:** Operations  
**Required reviewers:** Engineering, Security, Finance, and the relevant domain owner  
**Authority:** `docs/09-integrations.md`, `docs/10-security-and-compliance.md`, and `docs/13-covenant-pilot-readiness.md`

Runbooks must state detection, authority, containment, evidence preservation, communication, recovery, reconciliation, escalation, rollback/restart conditions, owner roles, last-tested date, and next review/expiry.

Do not embed credentials, personal phone numbers, private emails, customer details, bank information, or direct secret-bearing dashboard links. Contact and escalation information must use roles or approved internal directory references.

A runbook is not ready merely because the file exists; it must be rehearsed and evidenced by the intended operators.

Deployment runbooks:

- [`staging-deployment.md`](staging-deployment.md)
- [`staging-rollback.md`](staging-rollback.md)
- [`environment-isolation.md`](environment-isolation.md)
