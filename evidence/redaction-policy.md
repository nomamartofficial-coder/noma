# Evidence redaction policy

Repository evidence is metadata-only by default.

Prohibited repository content includes:

- passwords, tokens, API keys, private keys, connection strings, cookies, OTPs, and webhook secrets;
- raw identity documents, bank statements, account numbers, payment-card data, or payout details;
- real email addresses, phone numbers, room locations, private messages, case narratives, or customer names;
- unredacted provider payloads, production logs, database dumps, screenshots, exports, or support attachments;
- vulnerability details that materially increase exploitability without access control.

Permitted content includes role names, opaque test IDs, synthetic fixture references, commit/release/environment metadata, sanitised summaries, checksums, approved restricted-system references, expiry, owners, limitations, and defect IDs.

Redaction must preserve the facts needed to evaluate the requirement. Deleting failures or limitations to make evidence appear green is prohibited.
