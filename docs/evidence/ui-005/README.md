# UI-005 synthetic visual evidence

This folder records local, synthetic presentation review for the UI-005 Seller, Rider, Operations, and Restricted Administration shells. Every review screen is labelled “Synthetic UI-005 shell review fixture” and contains no user, seller, rider, order, financial, provider, credential, or production data. The production routes remain fail closed; screenshots are not authentication or authorization evidence.

## Captures

| File | Viewport | Review state |
| --- | ---: | --- |
| `seller-320.png` | 320 px | Seller reflow and compact menu |
| `seller-390.png` | 390 px | Seller context and long-copy review |
| `seller-768.png` | 768 px | Seller tablet composition |
| `seller-1024.png` | 1024 px | Seller persistent rail boundary |
| `seller-1440.png` | 1440 px | Seller desktop density |
| `rider-action-390.png` | 390 px | Rider action/help separation and 48 px critical action |
| `rider-connectivity-768.png` | 768 px | All seven connectivity truth states |
| `operations-768.png` | 768 px | Compact Operations menu and semantic queue |
| `operations-1024.png` | 1024 px | Operations rail and controlled table overflow |
| `operations-1440.png` | 1440 px | Operations desktop queue density |
| `admin-768.png` | 768 px | Supplied-only Admin menu and review composition |
| `admin-1024.png` | 1024 px | Restricted Admin rail boundary |
| `admin-1440.png` | 1440 px | Admin desktop comparison/review posture |

## Review notes

- The captured 320, 390, 768, 1024, and 1440 CSS-pixel layouts preserve a single main landmark and avoid document-level horizontal overflow; the Operations table owns its bounded overflow.
- Seller and Operations switch from compact navigation to persistent rails at 1024 px. Rider remains a single-column action canvas. Administration prioritises comparison and review rather than quick actions.
- Rider evidence distinguishes server-confirmed, cached, local-draft, pending-sync, sync-failed, conflict, and connection-required states. Draft and pending states do not claim pickup or delivery completion.
- Keyboard review covers the compact Menu and visible focus. Component tests cover focus interaction and representative axe scans.
- The 320 px review covers the narrow-layout equivalent used for reflow assessment and preserves readable content and Noma target sizes. Exact browser 200% zoom remains an independent manual-review step. CSS policy covers reduced motion, forced colours, safe areas, and non-obscured focus.
- A semantic structure review confirms named navigation, one main landmark, headings, semantic table caption/headers, and live-region selection. No unsupported operating-system or screen-reader result is claimed; full intended-actor assistive-technology UAT remains a later QA obligation.

The temporary local synthetic review route used for these captures is removed before the final commit and is rejected by the UI-005 policy validator.
