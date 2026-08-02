# GitHub required-check configuration

> **Owner:** Repository administrator / Engineering
> **Reviewers:** QA and Security
> **Task:** `DEV-008`
> **Current state:** awaiting authorised configuration and independent verification

## Preconditions

1. The DEV-008 draft PR has produced successful runs on the exact reviewed head.
2. GitHub renders all five names exactly as documented below.
3. The deliberate manual failure (dispatch after merge, or the pre-merge `ci-force-failure` label event) has proved `Noma / Quality Gate` turns red and still uploads safe evidence; remove the label and require the recovery run to pass.
4. A subsequent ordinary run has turned all applicable gates green.
5. Dependency review and CodeQL availability are resolved or the Security Gate remains intentionally blocking.

## Required check names

Configure these exact stable names, never dynamic worker-job names:

```text
Noma / CI Policy
Noma / Quality Gate
Noma / Integration Gate
Noma / Security Gate
Noma / Windows Compatibility
```

## Recommended branch ruleset

An authorised repository owner should open **Settings → Rules → Rulesets**, create a branch ruleset targeting the default branch `main`, and independently review these settings before activation:

- require a pull request before merging;
- require at least one human approval and dismiss stale approvals after new commits;
- require conversation resolution;
- require the five status checks above to pass and require the branch to be current before merge;
- block force pushes and branch deletion;
- do not create broad bypass roles; document any unavoidable break-glass authority;
- enable merge queue only after a real `merge_group` run proves the same checks appear and pass; and
- keep deployment/environment rules out of DEV-008.

Save the ruleset only after a second reviewer confirms the target, checks, bypass actors, and enforcement mode. Record the ruleset identifier and verification date in the DEV-008 PR; do not store private administrator details or tokens.

## Security settings requiring administrator action

Under repository or organisation security settings:

1. Enable dependency graph so `actions/dependency-review-action` can evaluate pull-request changes.
2. Enable secret scanning and push protection for the public repository.
3. Enable Dependabot security updates after Security reviews alert ownership and patch handling.
4. Require actions to be pinned to full commit SHAs if the organisation/repository setting is available.
5. Keep the default workflow token permission read-only and keep Actions unable to approve pull requests.
6. Review whether only selected/verified actions should be allowed; the committed validator remains the source-level allow-list.

CodeQL uses the committed advanced workflow. Do not enable duplicate default setup unless Security intentionally changes the ownership model.

## Verification

Open a harmless follow-up pull request or use the DEV-008 PR while it remains draft:

- confirm all five checks appear;
- confirm a failing gate blocks merge;
- confirm a new commit invalidates stale approval if configured;
- confirm force push and branch deletion are blocked;
- confirm no administrator/bypass path silently merges around failed P0 checks;
- if merge queue is enabled, enqueue and verify the `merge_group` run; and
- record safe screenshots/identifiers without tokens, private settings, personal data, or unrestricted security details.

Until this verification is complete, report branch protection as `AWAITING_ADMIN_CONFIGURATION`, not `PASS`.

## Failure and recovery

If a required check disappears, do not weaken protection. Confirm workflow syntax, trigger coverage, stable job name, repository Actions availability, and concurrency before changing the ruleset. If GitHub has an incident, keep the PR unmerged or use only an explicitly authorised and evidenced emergency process from the Build Pack.

Rollback is an authorised ruleset edit or disable action with reviewer evidence. Source workflow rollback remains a normal reviewed revert; neither action deploys or activates Noma.
