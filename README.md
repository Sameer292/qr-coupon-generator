# Fresh Masala Coupon Generator

A fully client-side web app for producing print-ready promotional coupon batches, each with two QR codes and a cryptographically random verification token. It is built for the Fresh Masala festive campaign but the branding, URLs, numbering, and card layout are configurable.

Nothing is uploaded. Coupon tokens are generated in the browser with the Web Crypto API, cards are rasterised with Canvas, PDFs are assembled with jsPDF, and the manifest is exported as CSV. The generated files are the only outputs.

## What it produces

For a batch of N coupons:

| Output | Details |
| --- | --- |
| Split PDFs | A4 portrait, 2 × 5 grid (10 cards per sheet), 90 mm × 50 mm cards, 5 mm gutters, crop marks, 300 DPI artwork. Split into files of 100, 250, or 500 coupons. |
| `manifest.csv` | Header `coupon_code,qr_token,batch_id,generated_at`, one row per coupon, UTF-8 with Unix line endings. |
| ZIP bundle | All PDFs plus `manifest.csv` in a folder named `coupons_<BATCH_ID>`. |

PDF file names follow `coupons_<BATCH_ID>_<start>-<end>.pdf`, for example `coupons_BATCH-2026-01_0001-0250.pdf`.

## How the app works

The UI is a three-step flow:

1. **Config** — upload a logo (PNG/SVG/JPEG), set the WhatsApp and landline numbers, Linktree URL, verification endpoint, coupon prefix, starting number, quantity, batch ID, and how many coupons go in each PDF. A live summary shows the sequence range, file count, and page count.
2. **Live Preview** — renders a real coupon on a canvas, offers a one-page test PDF with 10 sample cards, and includes a drag-and-slider layout editor for the logo, phone block, QR codes, headings, coupon code box, footer, and activation banner.
3. **Batch Export** — generates the tokens and PDFs with progress, cancellation, and an integrity audit, then exposes the CSV, individual PDFs, and the ZIP bundle.

### Coupon anatomy

Each 90 × 50 mm card contains:

- Brand logo, WhatsApp number, optional office landline.
- A static **Linktree QR** (`errorCorrectionLevel: 'M'`) with a "FOLLOW US" caption.
- The printed coupon code, e.g. `FM-00001`, in large monospace type.
- A **verification QR** (`errorCorrectionLevel: 'Q'`) encoding `<verificationBaseUrl>/?t=<32-char-token>` with a "SCAN HERE TO ACTIVATE" banner.
- Batch ID and campaign footer text.

The card template is rendered once, then only the dynamic code and verification QR are stamped per coupon. This keeps large batches practical.

### Token generation and audit

- 24 random bytes from `crypto.getRandomValues` are Base64URL-encoded and truncated to 32 characters.
- A `Set` rejects collisions while generating.
- Before any download, `performSelfCheck` verifies the requested count, unique coupon codes, unique tokens, 32-character URL-safe tokens, and a uniform timestamp.
- Downloads are disabled unless the audit passes.

### Security model

`manifest.csv` contains the secret token for every coupon. It must be imported into the WordPress verification endpoint and then stored/deleted securely. Anyone with the file can forge activations. The app never sends it anywhere.

The app is client-side only, but note that the page loads Google Fonts (Cinzel, Inter, JetBrains Mono, Playfair Display) from `fonts.googleapis.com` / `fonts.gstatic.com`, so the header's "zero external server calls" claim is not strictly true. Self-host the fonts if the tool must run fully offline.

## Stack

- React 19 + TypeScript (strict)
- Vite 8
- Tailwind CSS 4
- `qrcode`, `jspdf`, `jszip`, `canvas-confetti`, `lucide-react`
- Oxlint

## Getting started

Requires [Bun](https://bun.sh) (the lockfile is `bun.lock`).

```bash
bun install
bun run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

### Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the Vite dev server. |
| `bun run build` | Type-check and build to `dist/`. |
| `bun run typecheck` | Type-check only. |
| `bun run lint` | Run Oxlint. |
| `bun run test` | Run the token, sequence, self-check, and CSV verification suite. |
| `bun run check` | Lint, type-check, test, then build. |
| `bun run preview` | Serve the production build locally. |

## Project layout

```text
src/
  App.tsx                     screen state, validation, generation orchestration
  components/
    ConfigScreen.tsx          configuration form and batch summary
    PreviewScreen.tsx         canvas preview, sample PDF, layout editor entry
    VisualLayoutEditor.tsx    drag overlay and slider inspector
    GenerationScreen.tsx      progress, audit results, downloads
    CouponCard.tsx            live canvas coupon preview
    Header.tsx                step navigation
  types/coupon.ts             config, layout, coupon, and progress contracts
  utils/
    security.ts               secure token generation and pre-export audit
    qr.ts                     Linktree and verification QR rendering
    couponCanvas.ts           1063 × 591 card template and per-coupon stamping
    pdf.ts                    A4 imposition, crop marks, PDF splitting
    csv.ts                    manifest schema and download
    zip.ts                    ZIP bundling
    defaultLogo.ts            default Fresh Masala SVG logo
test/verify.js                automated verification suite
```

## Defaults

The app opens with a sample batch: 5,000 coupons starting at `FM-00001`, batch `BATCH-2026-01`, 250 coupons per PDF, a Fresh Masala demo logo, and placeholder contact/URL values. Replace them before producing a real batch.

## Known limitations

- **Memory and time scale with batch size.** Every coupon is rendered to a 1063 × 591 JPEG and every PDF is kept as an in-memory blob. Very large runs (up to 20,000 coupons) can take a long time and may exhaust browser memory. Prefer several smaller batches.
- **Verification URLs are built by string concatenation.** A base URL that already contains other query parameters may produce a malformed link. Use a clean endpoint such as `https://example.com/verify/`.
- **Layout is not persisted.** Refreshing the page resets the configuration and layout to defaults.
- **The layout editor renders an overlay and an inspector.** Selecting an element in the overlay is not reflected in the inspector's selection until it is clicked there.
- **No automated UI or PDF snapshot tests.** The verification suite covers tokens, sequencing, audit logic, and CSV output.
