# Fresh Masala Coupon & Cash Claims Platform

A complete solution for producing, distributing, validating, and redeeming promotional coupons. The repository consists of a high-performance **client-side batch generator** (supporting two campaign modes) and **two standalone WordPress plugins** for server-side verification and payout management.

---

## Campaign Modes

The platform supports two distinct promotional coupon campaigns:

### 1. Cash-Prize Claims (`/claim/?t=<token>`)
* **Concept**: Fixed prize-tier batches where every coupon holds a guaranteed cash prize (e.g. 50 × Rs. 1,000, 200 × Rs. 500, 1,000 × Rs. 100).
* **Artwork**: The actual prize amount is **never** printed on the physical card. The coupon features the prominent tagline `"GUARANTEED CASH PRIZE — SCAN TO REVEAL"`.
* **Redemption Model**: First complete claim submission wins. Scanning the QR reveals the prize amount and prompts for claimant details (name, phone, optional 9-digit PAN).
* **Payout**: Manual end-of-day payout by admins from verified submissions.
* **WordPress Plugin**: `plugins/fm-cash-claims/` (menu: **Cash Claims**).
* **Documentation**: See [docs/cash-prize-claims.md](docs/cash-prize-claims.md) for full architecture and runbook.

### 2. Weekly Festive Draw (`/verify/?t=<token>`)
* **Concept**: Promotional customer lucky-draw campaign.
* **Artwork**: Visual branding with contact info, Linktree QR code, monospace coupon code, and verification QR code.
* **Verification**: Customers scan to verify and register their coupon for scheduled weekly draws.
* **WordPress Plugin**: `plugins/fm-festive-draw/` (menu: **Festive Draw**).

---

## What the Generator Produces

| Mode | Outputs | Details |
|---|---|---|
| **Cash Prize** | Split PDFs, `manifest.csv`, `batch-summary.json`, ZIP | Tier-grouped PDFs (organized in folders by cash prize amount), 6-column manifest, summary JSON with code ranges. |
| **Weekly Draw** | Split PDFs, `manifest.csv`, ZIP | Split PDFs (100/250/500 coupons per file), 4-column manifest. |

### Manifest Schemas

#### Cash-Prize Manifest (`manifest.csv`)
Header: `coupon_code,qr_token,batch_id,prize_amount,currency,generated_at`
```csv
coupon_code,qr_token,batch_id,prize_amount,currency,generated_at
FM-00001,8Fk3...32chars...,BATCH-2026-01,1000,NPR,2026-10-29T10:00:00.000Z
FM-00002,3Nm9...32chars...,BATCH-2026-01,1000,NPR,2026-10-29T10:00:00.000Z
```

#### Weekly Draw Manifest (`manifest.csv`)
Header: `coupon_code,qr_token,batch_id,generated_at`
```csv
coupon_code,qr_token,batch_id,generated_at
FM-00001,8Fk3...32chars...,BATCH-2026-01,2026-10-29T10:00:00.000Z
```

---

## Security Model & Manifest Rules

> [!IMPORTANT]
> **Import Before Physical Distribution**:  
> `manifest.csv` contains all secret 32-character tokens. It **must** be imported into the corresponding WordPress plugin (**Cash Claims &rarr; Import**) before coupons are printed and handed to customers.

* **Cryptographic Tokens**: Generated using Web Crypto (`crypto.getRandomValues`), Base64URL-encoded (32 characters).
* **Zero Server Transmission**: All token generation, canvas rasterization, PDF compilation, and ZIP bundling occur entirely in the user's browser.
* **Pre-Export Integrity Audit**: Pre-download checks verify coupon counts, tier breakdowns, token uniqueness, and liability totals.
* **One-Time Success Transient**: When a claimant submits a claim, sensitive reference data is stored in a single-use transient. Public status lookups only show coupon code and claim status, protecting customer privacy.
* **Row-Level Concurrency Locking**: WordPress plugins employ MySQL `FOR UPDATE` transactions to prevent duplicate submissions or race conditions.

---

## WordPress Plugins

The repository contains two independent WordPress plugins located in the `plugins/` directory:

### 1. FM Cash Claims (`plugins/fm-cash-claims/`)
* **Menu**: `Cash Claims`
* **Features**:
  - Manifest CSV upload with server-side token preview masking.
  - Public claim handler supporting `/claim/?t=<token>` and fallback query parameters.
  - Claim management table with filters (pending payout, paid, rejected).
  - Bulk "Mark selected as paid" action and individual claim inspection.
  - Daily payout CSV export with UTF-8 BOM encoding.
  - Scan and security audit logging.
  - Complete uninstall cleanup (`fm_cash_*` database tables and transients).

### 2. FM Festive Draw (`plugins/fm-festive-draw/`)
* **Menu**: `Festive Draw`
* **Features**:
  - Import manifest for lucky draw campaigns.
  - Customer registration and weekly draw selection.
  - Winner draw dashboard and export.

---

## Tech Stack

* **Frontend**: React 19, TypeScript (strict), Vite 8, Tailwind CSS 4
* **Libraries**: `jspdf`, `jszip`, `qrcode`, `canvas-confetti`, `lucide-react`
* **Linter & Tools**: Oxlint, Bun
* **Backend**: WordPress 6.2+, PHP 8.1+, MySQL 8.0+

---

## Getting Started

### Generator App
Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

Open `http://localhost:5173` in your browser.

### Verification & Build Scripts

| Command | Purpose |
|---|---|
| `bun run dev` | Start local Vite development server. |
| `bun run build` | Compile TypeScript and build production bundle into `dist/`. |
| `bun run typecheck` | Run TypeScript compiler checks (`tsc -b`). |
| `bun run lint` | Run Oxlint fast linter. |
| `bun run test` | Run complete automated verification suite (Draw & Cash test suites). |
| `bun run check` | Run lint, typecheck, test, and production build in sequence. |

---

## Project Structure

```text
├── docs/
│   └── cash-prize-claims.md        # In-depth cash campaign architecture & runbook
├── plugins/
│   ├── fm-cash-claims/             # Cash prize redemption & payout WordPress plugin
│   │   ├── fm-cash-claims.php      # Plugin bootstrap & lifecycle
│   │   ├── includes/               # DB, claim routing, admin, importer, export, list table
│   │   ├── templates/              # Public claim form, success, status, error views
│   │   └── readme.txt              # WordPress plugin directory readme
│   └── fm-festive-draw/            # Existing weekly draw verification plugin
├── src/
│   ├── App.tsx                     # Mode switching, validation, generation orchestration
│   ├── components/                 # UI screens for Draw and Cash modes
│   │   ├── CashConfigScreen.tsx    # Cash tier config, liability calculation, batch parameters
│   │   ├── CashPreviewScreen.tsx   # Canvas card preview & sample test sheet
│   │   ├── CashGenerationScreen.tsx# Progress, audit validation, downloads
│   │   └── ...
│   ├── types/coupon.ts             # Contracts for draw and cash campaigns
│   └── utils/                      # Canvas stamping, QR, PDF imposition, CSV, ZIP bundling
└── test/
    ├── verify.js                   # Draw verification suite
    └── cash.js                     # Cash campaign verification suite
```
