# UI-006 synthetic baseline evidence

This directory links the reviewed, synthetic UI-006 visual evidence. The canonical 31 PNG baselines live beside the owning Playwright specification at `apps/web/stories/visual/__screenshots__/`; keeping images with the test makes each expected result directly reviewable with its manifest entry.

The manifest contains:

- 2 foundation views;
- 6 primitive/form views, including forced-colour focus;
- 7 commerce views;
- 6 Marketplace/Buyer views, including the open surface switcher;
- 1 neutral protected-unavailable view;
- 2 Seller views;
- 3 Rider views;
- 2 Operations views; and
- 2 Admin views.

All values are synthetic. The images contain no person, institution account, order, payment, credential, provider payload, private URL, or production record. Protected production routes remain unavailable and the neutral denial story does not state why access is unavailable.

## Review record

- Windows Chromium smoke: all 31 manifest entries rendered with external requests blocked.
- Storybook Chromium suite: all eligible stories passed interaction assertions and error-level axe enforcement.
- Canonical pixel comparison: generated and compared only on Ubuntu 24.04 with Playwright Chromium `1.62.1`; see the committed PNG set and draft PR gate evidence.
- Manual keyboard, focus, zoom/reflow, reduced-motion, forced-colour, target-size, and available screen-reader evidence must be recorded by the reviewer who actually performed it. This file does not fabricate an unavailable assistive-technology result.

Read [`STORYBOOK.md`](../../../STORYBOOK.md) and [`VISUAL_TESTING.md`](../../../VISUAL_TESTING.md) for the inventory, state, accessibility, review, update, and rollback contracts.
