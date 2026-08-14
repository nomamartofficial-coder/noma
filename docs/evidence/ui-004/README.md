# UI-004 synthetic visual evidence

This folder records local, synthetic review evidence for the Marketplace and Buyer Account shells. It contains no customer, order, provider, credential, or production data. The screenshots demonstrate presentation and navigation behavior only; they are not evidence of authentication, authorization, or completed downstream features.

## Captures

| File | Viewport | Review state |
| --- | ---: | --- |
| `marketplace-320.png` | 320 px | Marketplace reflow and five-item consumer navigation |
| `buyer-orders-current-390.png` | 390 px | Buyer Orders current-location state |
| `marketplace-categories-480.png` | 480 px | Categories placeholder and current mobile navigation |
| `buyer-refunds-tablet-768.png` | 768 px | Compact account navigation at the tablet boundary |
| `buyer-profile-desktop-1024.png` | 1024 px | Desktop account rail and Profile & Security current state |
| `marketplace-desktop-1440.png` | 1440 px | Marketplace desktop shell and restrained footer |
| `surface-switcher-open-390.png` | 390 px | Supplied-only Shop and My account destinations |
| `keyboard-focus-390.png` | 390 px | Visible keyboard focus on the surface switcher |
| `account-loading-768.png` | 768 px | Safe account-scoped loading boundary |
| `account-error-768.png` | 768 px | Redacted account-scoped error and retry action |
| `marketplace-zoom-review-390.png` | 390 px at 200% browser zoom | Zoom/reflow review before the browser was reset |

## Review notes

- The 320 px Marketplace, 390 px Buyer Orders, 480 px Categories, 768 px Buyer Refunds, 1024 px Buyer Profile, and 1440 px Marketplace reviews had one main landmark and no horizontal document overflow.
- The mobile navigation exposed exactly Home, Categories, Search, Orders, and Cart. At 320 px, each target measured at least 48 px high.
- The 768 px review used the compact account menu and hid consumer mobile navigation. The 1024 px review displayed the account rail and highlighted Profile & Security.
- The production surface switcher exposed only Shop on Noma and My account.
- Keyboard review showed a visible focus outline. The component suite also exercises menu keyboard behavior and focus movement.
- Loading preserved shell geometry and used an explicit status region. Error evidence did not render the supplied synthetic error detail and retained safe retry and account-overview actions.
- Component tests include representative automated accessibility scans. Reduced-motion and forced-colour handling is enforced by shell CSS and policy validation; these screenshots do not claim an operating-system-level audit.

The temporary local routes used to render loading and error evidence were removed before the final source build and are not production routes.
