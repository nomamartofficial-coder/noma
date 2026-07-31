# Security Records

**Primary owner:** Security  
**Required reviewers:** Engineering and Privacy  
**Authority:** `docs/10-security-and-compliance.md`

Use this directory for repository-safe security metadata: threat/risk decisions, scan summaries, access reviews, exception status, penetration-test remediation, secret-rotation attestations, and incident/recovery references.

Do not commit exploitable secret values, raw vulnerability payloads, customer data, credentials, private keys, tokens, internal production dumps, or unrestricted evidence. Sensitive technical detail belongs in an approved restricted system with a safe repository pointer.

Every record requires the exact commit/environment, owner, verifier, date, expiry or review trigger, severity, limitations, remediation owner, and rollback or containment path.
