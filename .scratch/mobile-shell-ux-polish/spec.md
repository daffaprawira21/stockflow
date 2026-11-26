# Mobile Shell UX Polish

Status: resolved

## Summary

A batch of mobile-shell and control-surface refinements, applied via `/impeccable critique` passes. All changes are copy, spacing, and state-feedback; no layout, navigation, or API changes.

## Changes

### 1. Dashboard section title — "Fulfillment pipeline" → "Order status"

`app/(admin)/page.tsx` carried the section title "Fulfillment pipeline" above the four
status cards. "Pipeline" implied a flow/sequence the four parallel count cards do not
show, and CANCELLED is a terminal exception, not part of the flow. The operator-facing
vocabulary in PRODUCT.md is "creating, confirming, shipping, cancelling." "Order
status" is dead accurate and costs zero.

- `app/(admin)/page.tsx`: `<h2>Fulfillment pipeline</h2>` → `<h2>Order status</h2>`

### 2. Duplicate theme toggle on mobile — removed the top-bar instance

`app/(admin)/mobile-shell.tsx` rendered `ThemeToggle` in two places that are both live
on mobile: the sticky top bar (always visible) and the off-canvas sidebar footer
(visible when the drawer opens). Same control, same `localStorage` key, zero added
value. The top-bar instance was removed; the sidebar-footer instance is the single
source of truth.

- `app/(admin)/mobile-shell.tsx`: removed `<ThemeToggle />` from `.mobile-bar`;
  comment updated to "Theme lives in the sidebar footer alongside Sign out."
- `tests/theme-toggle.spec.ts`: comment updated — no longer claims "two toggles
  (mobile bar + sidebar footer)."
- `app/globals.css`: `.theme-toggle` base rule now applies inside the drawer
  with no media-query override.

### 3. Page titles glued to the mobile top bar — added breathing room

`.main` had `padding-top: 0` at every mobile breakpoint, so `.page-title` sat flush
against the sticky `.mobile-bar` (68px tall). On a task surface the title reads as
"you are here"; it needs a gap to break the "glued to the bar" feel.

- `app/globals.css` `@media (max-width: 899px)`: `.main { padding: 24px; padding-top: 16px; }`
- `app/globals.css` `@media (max-width: 599px)`: `.main { padding: 16px; padding-top: 12px; }`
- `app/globals.css` `@media (min-width: 600px) and (max-width: 899px)`: sets
  `.main { padding: 24px; }` so tablet uses the 24px padding scale.
  *Note: this rule pre-dates PR #19; it was already present in the codebase before
  this spec was written. The spec's "Files touched" split is historical, not
  authoritative for attribution.*

### 4. Mobile bar logo too small next to the hamburger — 28px → 32px

The 28px logo beside the 44px `.menu-toggle` read as a sub-icon, not a mark. Bumped
to 32px (the mark's native viewBox size) and raised its corner radius from 6px to 8px
to match the 8px rounding system. The hamburger stays 44px — WCAG 2.2 target-size
floor; the logo is the right side to nudge.

- `app/(admin)/mobile-shell.tsx`: `<Logo style={{ width: 28, height: 28 }} />` → `32`
- `app/globals.css`: `.mobile-bar-brand svg { border-radius: 8px; }`

### 5. Ghost buttons ambiguous at rest — hairline border + full-contrast ink

`.btn-ghost` was `transparent` fill + `transparent` border + `ink-muted` text.
Without hover it looked like a label, not a control. Every ghost button on the site
(back-links on create/detail pages, cancel/confirm/ship on orders, logout, pagination
controls) now reads as a button at rest.

- `app/globals.css` `.btn-ghost`:
  - `border-color: transparent` → `var(--color-border)`
  - `color: var(--color-ink-muted)` → `var(--color-ink)`

### 6. `.btn:hover` invisible in light mode — border now shifts

Light-mode hover only swapped `surface-2` → `bg-soft`, two values that are nearly
identical (`#f4f4f5` → `#f4f4f5` on a `#fafafa` page). The border was the only
changed property and it stayed `#e4e4e7`, so the hover read as nothing. Now the
border darkens to `ink-muted` on hover, a clear edge signal in both themes.

- `app/globals.css` `.btn:hover`: added `border-color: var(--color-ink-muted);`

### 7. `.btn:active` pressed state — tactile feedback

No `:active` rule existed. A press-and-hold on a button gave zero visual feedback.
Added an inset shadow (the only token-agnostic "deeper" signal that works in both
themes without a new color) plus the darker border carried from hover.

- `app/globals.css` new rule:
  ```css
  .btn:active {
    background-color: var(--color-surface-2);
    border-color: var(--color-ink-muted);
    box-shadow: inset 0 3px 6px rgb(0 0 0 / 0.4);
  }
  ```

## Verification

- `tsc --noEmit` clean
- `npm run build` clean
- Playwright: `tests/theme-toggle.spec.ts` "login page exposes a theme toggle" passes.
  The "switches and persists" test fails identically on the pre-change tree — a
  pre-existing no-flash-script race, not introduced by this work.
- Mobile shell verified at 390×844 on `/`, `/products`, `/orders`, `/inventory` with
  a real session: one toggle in the drawer, 16px/12px title gap, 32px logo, ghost
  buttons legible at rest, hover and active states confirmed via computed styles.
- Dashboard light-mode rest/hover/active captured at 1440×900.

## Files touched

PR #19 (this spec scope):
- `app/(admin)/page.tsx`
- `app/(admin)/mobile-shell.tsx`
- `app/globals.css`
- `tests/theme-toggle.spec.ts`
- `.scratch/mobile-shell-ux-polish/spec.md`

PR #18 (theme toggle feature, in the same diff range `5f35b27...HEAD`):
- `DESIGN.md`
- `app/(admin)/theme-toggle.tsx`
- `app/(auth)/login/page.tsx`
- `app/layout.tsx`
- `components/ui/Icons.tsx`

## Open notes

- `docs/mockup/stockflow-ui-preview.html` still says "Fulfillment pipeline" — it is a
  historical reference, intentionally left as is.
- The pre-existing `theme-toggle.spec.ts` "switches and persists" failure is tracked
  separately; fix is a test-isolation concern (clear `sf_theme` after the no-flash
  script runs, or skip the persistence write when the script just set the same value).
