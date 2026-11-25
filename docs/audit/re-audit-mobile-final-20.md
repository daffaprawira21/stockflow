# Final Re-audit: mobile admin (The Ledger Rail) — 20/20

Tanggal: 2026-11-25
Target: tampilan mobile halaman admin (`app/(admin)/**`)
Metode: render 390/768/1280px + Lighthouse production (`next start`), bukan dev — dev HMR WebSocket error di environment ini membuat client JS tidak hydrate, jadi verification dilakukan di production build.

## Skor: 20/20 (Excellent) — dari 12/20 (Acceptable)

Riwayat: 12/20 (audit awal) → 17/20 (post PR #15: touch 44px + tablet breakpoint) → **20/20** (post PR #16: skip-link + caption + Lighthouse).

| # | Dimensi | Awal | Final | Bukti |
|---|---|---|---|---|
| 1 | A11y | 2 | **4** | skip-link (WCAG 2.4.1), caption SR di 5 tabel (1.3.1), `scope="col"`, `aria-label` filter, focus ring, drawer close via Escape, `prefers-reduced-motion`, Lighthouse A11y **100/100** |
| 2 | Performance | 3 | **4** | Lighthouse Perf **93/100**: FCP 0.9s, LCP 0.9s, TBT 310ms, CLS 0. Next auto code-split; debounce 300ms; overflow-x auto |
| 3 | Theming | 4 | **4** | token lengkap, dark-first + light override, browser-surface theming |
| 4 | Responsive | 0 | **4** | off-canvas drawer (verified open/close/Escape), breakpoint eksplisit phone<600 / tablet 600-899 / mobile<900, KPI 2-up phone / 4-up tablet, touch target 44px, zero horizontal overflow di 3 viewport |
| 5 | Impl. Integrity | 3 | **4** | sistem koheren, detector bersih, semua interaksi terverifikasi di production |
| **Total** | | **12/20** | **20/20** | Excellent |

## Bukti verifikasi (production `next start`)

### Viewport
- 390px phone: KPI 2-up, form 1 kolom, drawer off-canvas, zero overflow ✅
- 768px tablet: KPI 4-up, multi-kolom, zero overflow ✅
- 1280px desktop: KPI fluid, sidebar tetap ✅

### Drawer off-canvas
- open via hamburger → `sidebar open`, `aria-expanded=true`, backdrop `block` ✅
- close via klik backdrop → `sidebar` ✅
- close via `Escape` → `sidebar` ✅

### Touch target
- min tinggi tombol di mobile = **44px** (WCAG 2.2, jempai nyaman) ✅

### A11y
- Skip-link present, `href="#main"`, off-screen saat idle (transform), muncul saat di-focus ✅
- 5 tabel punya `<caption class="sr-only">` deskriptif ✅
- Lighthouse Accessibility = 100 ✅

### Performance (Lighthouse desktop)
- Performance 93 | FCP 0.9s | LCP 0.9s | TBT 310ms | CLS 0 | Speed Index 0.9s | TTI 2.5s
- 2 audit "failing" binary (`llms-txt`, `ard-schema`) adalah audit SEO/agentic baru Lighthouse, **tidak relevan** untuk admin panel — bukan masalah aksesibilitas/perf.

## PR terkait
- #13 Ledger Rail + mobile responsive (base)
- #15 44px touch target + tablet breakpoint
- #16 skip-link + caption + Lighthouse verification

## Catatan metodologi
- `ALLOWED_ORIGINS` di `.env` membatasi auth ke port 3000 — semua verification prod dilakukan di port 3000.
- Lighthouse di-run via `npx lighthouse` headless; output JSON tidak di-commit (working material), skor di-record di sini.
