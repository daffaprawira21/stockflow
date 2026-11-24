# Re-audit: mobile admin (The Ledger Rail) — post-fix

Tanggal: 2026-11-25
Target: tampilan mobile halaman admin (`app/(admin)/**`)
Metode: render 390px (iPhone 17, `isMobile + hasTouch`) via session cookie ke **production** `next start` (bukan dev — dev HMR WebSocket error membuat hydration/client JS tidak jalan, jadi verification dilakukan di production build untuk validitas).

## Skor: 17/20 (Good) — naik dari 12/20 (Acceptable)

| # | Dimensi | Sebelum | Sesudah | Catatan |
|---|---|---|---|---|
| 1 | A11y | 2 | 3 | `scope="col"` di semua `<th>`, filter ber-`aria-label`, focus ring, drawer close via Escape + `prefers-reduced-motion` |
| 2 | Performance | 3 | 3 | debounce 300ms, `overflow-x:auto` pada tabel, tanpa layout thrash |
| 3 | Theming | 4 | 4 | token lengkap, dark-first + light override |
| 4 | Responsive | 0 | 3 | off-canvas sidebar, collapse grid form/detail, touch target min 40px, zero horizontal overflow di 7 halaman |
| 5 | Implementation Integrity | 3 | 4 | sistem koheren, detector bersih, drawer terverifikasi berfungsi di production |
| **Total** | | **12/20** | **17/20** | Good (address weak dimensions) |

## Bukti verifikasi (production `next start`, 390px)

- **Zero horizontal overflow** di 7 halaman: login, dashboard (`/`), products, inventory, orders, order-create, inventory-adjust
- **Off-canvas drawer**:
  - open via hamburger → `sidebar open`, `aria-expanded=true`, transform ke `0,0`, backdrop `block` ✅
  - close via klik backdrop → `sidebar` (tertutup) ✅
  - close via `Escape` → `sidebar` (tertutup) ✅
- **Touch target**: tinggi tombol min = 40px (≥ 24px WCAG AA SC 2.5.8, mendekati 44px)
- **Layout**: KPI 2-up, form 1 kolom, tabel scroll horizontal, `.page-header` stack vertikal

## Yang tersisa (non-blocking)

- **P2** Touch target 40px masih di bawah ideal 44px. Bisa ditingkatkan ke 44px di `.btn`/`.btn-compact` bila ingin nyaman di jempai.
- **P3** Belum ada breakpoint eksplisit untuk tablet (768px). Layout memakai satu threshold `<900px`. Bisa ditambahkan breakpoint 768px khusus untuk density tablet.

## Catatan metodologi
- Audit awal (12/20) dilakukan saat P0–P3 masih terbuka. Setelah fix ter-merge (PR #13), re-audit ini mengonfirmasi P0 (shell terpotong), P1 (grid form), P2 (touch target, tabel `scope`) ter-address.
- Verification drawer **harus** di production build: dev server Next 16 di environment ini mengalami `ERR_INVALID_HTTP_RESPONSE` pada HMR WebSocket sehingga client JS tidak hydrate dan interaktivitas tidak bisa dites. Production `next start` (chunks production, tanpa HMR) adalah ground truth.
- `ALLOWED_ORIGINS` di `.env` membatasi auth ke port 3000 — jadi production server dites di port 3000 (bukan port lain) agar login berfungsi.
