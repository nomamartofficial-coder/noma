# UI-003 synthetic visual review evidence

These captures use synthetic labels, references, timestamps, and values. They contain no customer,
provider, production, or credential data and exercise presentation only.

| Capture | Review focus |
| --- | --- |
| `commerce-390.png` | single-column reflow, long exact money, caller-supplied uncertainty/failure |
| `commerce-768.png` | breakpoint transition, readable metadata and action targets |
| `commerce-1440.png` | two-column composition, ordered history, safe evidence metadata |
| `confirmation-390.png` | high-risk dialog reflow, explicit consequence, least-destructive focus |

The temporary route used for these captures was removed before commit. Automated component tests
remain authoritative for focus containment/restoration, reason validation, pending duplicate
prevention, semantic structure, and callback boundaries. These images are review aids, not proof of
business authorization or completion.
