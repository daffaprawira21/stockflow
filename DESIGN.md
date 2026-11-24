# Design

<!-- impeccable:design-schema 1 -->

## Overview

**The Ledger Rail** — an operator's cockpit for StockFlow's inventory & order admin. A persistent left data rail, a top command bar, and a dense work area of KPI strip + sortable tables. The world lends four things and only these: type (tabular sans figures on a strict 8px grid), palette (monochrome slate ground + indigo action accent + state colors), density (hairline borders, compact rows), and one signature move (low-stock rows carry an amber leading edge; data updates read as a quiet cascade). It never supplies the layout, navigation model, or controls — those stay standard web admin patterns.

Mode: **Operate**. Primary user: super admin / operator who scans lists and acts fast. The interface is the tool; it gets out of the way.

## Colors

| Token | Dark (default) | Light | Role |
|---|---|---|---|
| `--color-bg` | `#09090b` | `#fafafa` | Page canvas |
| `--color-bg-soft` | `#18181b` | `#f4f4f5` | Hover ground |
| `--color-surface` | `#18181b` | `#ffffff` | Cards |
| `--color-surface-2` | `#27272a` | `#f4f4f5` | Elevated / input fill |
| `--color-border` | `#3f3f46` | `#e4e4e7` | Hairline borders |
| `--color-ink` | `#fafafa` | `#09090b` | Primary text |
| `--color-ink-muted` | `#a1a1aa` | `#71717a` | Secondary text |
| `--color-primary` | `#4f46e5` | `#4f46e5` | Action accent (single) |
| `--color-primary-soft` | `#3730a3` | `#eef2ff` | Active nav pill |
| `--color-danger` | `#ef4444` | `#dc2626` | Destructive |
| `--color-status-pending` | `#f59e0b` | `#b45309` | Pending / low-stock |
| `--color-status-confirmed` | `#4f46e5` | `#4338ca` | Confirmed |
| `--color-status-shipped` | `#10b981` | `#047857` | Shipped / active |
| `--color-status-cancelled` | `#ef4444` | `#b91c1c` | Cancelled / inactive |

Dark is the default ground: an operator at a desktop in mixed office light; dark reduces glare and keeps figures crisp. Light is a full override via `prefers-color-scheme` / `data-theme`.

## Typography

System sans stack (`ui-sans-serif, system-ui, "Segoe UI", Roboto`). Base 14px. Page titles 20px/700, `-0.01em` tracking. Section titles 14px/600. Labels 12px/500 uppercase with `0.05em` tracking. KPI values 28px/700. All numeric data, currency, and dates use `font-variant-numeric: tabular-nums`.

## Layout

8px spacing rhythm. Sidebar 256px sticky. Main padding 24px. Cards `--radius-card: 8px`, inputs `--radius-input: 6px`. KPI grid `repeat(auto-fit, minmax(180px,1fr))` gap 16px. Detail views use a 2-column grid `repeat(auto-fit, minmax(320px,1fr))`. Tables scroll horizontally inside a card on narrow screens.

## Elevation & Depth

No decorative shadows. Depth comes from surface step-up: `bg → surface → surface-2`, all separated by 1px hairline `--color-border` edges.

## Shapes

Cards and buttons: 6–8px radius, never pill. Badges: full pill (999px) with a 6px status dot. KPI icon tiles: 32px, 6px radius, `surface-2` ground.

## Components

- **Button** — `btn` (secondary), `btn-primary` (single indigo action per view), `btn-danger`, `btn-ghost`. Loading state renders a 14px spinner in place of the leading icon.
- **Badge** — pill + status dot; variants `pending/confirmed/shipped/cancelled/active/inactive/low`.
- **StatCard** — icon tile + uppercase label + tabular value; optional link.
- **Pagination** — count label left, `Page X of Y` + prev/next ghost buttons right; full prev **and** next.
- **SearchInput** — 300ms debounce, magnifier + clear.
- **EmptyState** — icon, title, subtitle, optional CTA.
- **Logo** — indigo rounded square with a flow arrow (the favicon mark, scaled).

## Do's and Don'ts

- Do keep state colors doing real jobs (amber = pending/low, red = cancelled/danger, green = shipped/active).
- Do right-align and tabulate all money, quantities, and dates.
- Do carry an amber leading edge on low-stock rows (stock ≤ 5).
- Don't add a second accent color. Indigo is the only action color; everything else is state or neutral.
- Don't nest cards or add decorative shadows/gradients.
- Don't turn a working table into a costume (no split-flap flaps, no ledger paper) — the world lends palette, type, density, and one move only.
