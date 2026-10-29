# Cash Prize Coupon Campaign Guide

This document provides complete technical and operational documentation for the **Cash Prize Coupon Campaign** system, covering both the client-side generator and the standalone WordPress redemption plugin (`fm-cash-claims`).

---

## 1. System Architecture

The cash prize system is structured into two completely decoupled components:

```
┌─────────────────────────────────────────────────────────────┐
│                 Client-Side Generator (Browser)              │
│  - Configures fixed prize tiers (amount + quantity)         │
│  - Generates 32-char crypto random tokens via Web Crypto    │
│  - Imposes 15cm × 20cm (150×200 mm) portrait vouchers with crop marks│
│  - Groups output PDFs by prize tier into folder structures │
│  - Produces manifest.csv and batch-summary.json             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Secure Export  │ manifest.csv
              (Manual Handoff) │ (Zero cloud dependencies)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            WordPress Backend Plugin (fm-cash-claims)        │
│  - Imports manifest.csv with preview & token masking        │
│  - Public claim endpoint: /claim/?t=<token>                 │
│  - First complete submission wins (atomic DB row locking)   │
│  - One-time transient success view (claimant data protected)│
│  - Admin EOD payout list, bulk "Mark as Paid", CSV export   │
│  - Comprehensive scan and audit logging                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Design Principles & Security Model

1. **Zero External Server Dependency for Generation**:
   All tokens, canvas renders, PDF compilation, and ZIP bundling happen client-side in the user's browser. No coupon data is uploaded or transmitted across the wire during generation.
2. **Hidden Prize Amounts on Physical Coupons**:
   Coupons carry the printed code (e.g. `FM-00001`) and the exact text:  
   `"GUARANTEED CASH PRIZE — SCAN TO REVEAL"`.  
   The actual cash amount is **never** printed on the coupon; it is stored only in the manifest database and revealed upon scanning the QR code.
3. **Secret 32-Character QR Token**:
   The claim QR code encodes only:  
   `<claimBaseUrl>/?t=<32-character-url-safe-token>`  
   Any pre-existing query parameters in `claimBaseUrl` are preserved.
4. **First-Complete-Claim-Wins**:
   The winner is determined by who submits the valid claim form first. Row locks (`FOR UPDATE`) in a database transaction prevent race conditions or duplicate redemptions.
5. **Privacy Protections on Status Pages**:
   - Immediately following claim submission, a one-time transient key displays the claim reference and submitted details.
   - Once viewed (or expired after 15 minutes), subsequent queries to the public status page show only the coupon code and claim status (`pending`, `paid`, or `rejected`), omitting claimant names, phone numbers, and internal references.
6. **Manifest Security & Import-Before-Distribution**:
   **Critical Rule**: `manifest.csv` contains all raw secret tokens. It must be imported into the WordPress site **before** physical coupons are distributed. The manifest file must then be securely stored and deleted from unencrypted devices.

---

## 3. Data Schemas

### 3.1 Manifest CSV Schema

The manifest is exported as a UTF-8 CSV with Unix line endings (`\n`):

```csv
coupon_code,qr_token,batch_id,prize_amount,currency,generated_at
FM-00001,4Fh92kPq9X7yZ...32chars...,BATCH-2026-01,500,NPR,2026-10-29T10:00:00.000Z
FM-00002,9Xk21Lp8mN3bV...32chars...,BATCH-2026-01,500,NPR,2026-10-29T10:00:00.000Z
FM-00003,7Qm56Yt1zW8sR...32chars...,BATCH-2026-01,100,NPR,2026-10-29T10:00:00.000Z
```

| Field | Type | Description |
|---|---|---|
| `coupon_code` | string (max 30) | Unique human-readable code printed on the coupon (e.g., `FM-00001`). |
| `qr_token` | string (32 chars) | Cryptographically secure URL-safe Base64 token. |
| `batch_id` | string (max 50) | Batch identifier alphanumeric string. |
| `prize_amount` | decimal / int | Cash prize amount for this coupon tier. |
| `currency` | string (3 chars) | ISO currency code (default: `NPR`). |
| `generated_at` | ISO 8601 string | UTC generation timestamp. |

### 3.2 Batch Summary JSON

Included in the downloaded ZIP bundle as `batch-summary.json`:

```json
{
  "batch_id": "BATCH-2026-01",
  "currency": "NPR",
  "total_coupons": 1000,
  "total_payout": 250000,
  "tiers": [
    {
      "amount": 1000,
      "quantity": 100,
      "start_code": "FM-00001",
      "end_code": "FM-00100"
    },
    {
      "amount": 500,
      "quantity": 200,
      "start_code": "FM-00101",
      "end_code": "FM-00300"
    }
  ],
  "generated_at": "2026-10-29T10:00:00.000Z"
}
```

### 3.3 WordPress Database Tables

| Table Name | Purpose |
|---|---|
| `{$wpdb->prefix}fm_cash_batches` | Batch metadata, status (`active`, `closed`, `void`), total coupons, and value. |
| `{$wpdb->prefix}fm_cash_prize_tiers` | Tier breakdown per batch (amount and quantity). |
| `{$wpdb->prefix}fm_cash_coupons` | Master coupon records with tokens, prize amounts, and redemption status. |
| `{$wpdb->prefix}fm_cash_claims` | Claimant details (name, phone, PAN), claim reference, and payout status. |
| `{$wpdb->prefix}fm_cash_scan_log` | Complete scan and admin audit log with SHA-256 token hashes, results, and IPs. |

---

## 4. End-to-End Operational Workflow

### Step 1: Batch Generation (Generator App)
1. Open the generator app and switch to the **Cash Prize Claims** mode in the header.
2. In **Step 1: Configuration**:
   - Upload the brand logo.
   - Enter contact numbers (WhatsApp and optional office landline).
   - Enter your website claim endpoint (e.g. `https://example.com/claim/`).
   - Define **Prize Tiers**: Enter each prize amount and the quantity of coupons for that tier.
   - Configure batch parameters (prefix, starting sequence, batch ID, cards per PDF).
3. In **Step 2: Live Preview**:
   - Inspect the card design. Verify that the prize amount is NOT displayed on the card and the tagline `"GUARANTEED CASH PRIZE — SCAN TO REVEAL"` appears prominently.
   - Print a test sheet to verify QR scan accuracy.
4. In **Step 3: Batch Export**:
   - Click **Generate Cash-Prize Batch**.
   - Review the pre-export audit summary (verifying 0 code duplicates, 0 token collisions, and total payout calculation).
   - Download the generated ZIP package (`coupons_cash_<BATCH_ID>.zip`).

### Step 2: WordPress Manifest Import
1. Log in to the WordPress admin panel.
2. Navigate to **Cash Claims &rarr; Import**.
3. Upload `manifest.csv` from the downloaded ZIP bundle.
4. Review the **Import Preview**:
   - Check the detected batch ID, coupon counts, and total campaign liability.
   - Note that token samples are masked for safety (e.g., `aB3dE1...9xYz`).
5. Click **Confirm and Import Batch**.
6. Verify the batch status is **Active** under **Cash Claims &rarr; Batches**.

### Step 3: Physical Printing & Distribution
- Send the tier-grouped PDF files to the print vendor.
- Because coupons are sorted by tier in separate folders and file ranges, distribution can be targeted or randomized as required by marketing.

### Step 4: Customer Claim Submission
1. Customer scans the QR code on their coupon using a smartphone.
2. The phone opens `https://example.com/claim/?t=<32-char-token>`.
3. The page reveals the **Cash Prize Amount** and displays the claim form.
4. The claimant fills in:
   - Full Name (required)
   - Mobile Phone Number (required)
   - PAN Number (optional, 9 digits)
   - Agreement to Terms (required checkbox)
5. Upon submission, the claimant is redirected to a success screen with their unique **Claim Reference** (e.g., `CLM-20261029-ABC123`).

### Step 5: End-of-Day Payout & Reconciliation
1. At the end of each day, navigate to **Cash Claims &rarr; Claims** in WP Admin.
2. Filter the table by **Status: Pending Payout** and optionally by date.
3. Cross-reference the claimant's phone number or reference.
4. To mark claims paid:
   - **Individual**: Click on the claim to view details, enter an optional transaction or payout note, and click **Mark as Paid**.
   - **Bulk**: Select checkboxes for all paid claims, choose **Mark selected as paid** from the bulk actions dropdown, and click **Apply**.
5. Click **Export CSV** to download the day's payout ledger for financial audits.

---

## 5. Security & Maintenance Checklist

- [ ] **Import Before Handout**: Never distribute coupons before the manifest is imported.
- [ ] **Secure Storage**: Store copies of `manifest.csv` in encrypted storage; remove them from shared downloads folders.
- [ ] **Permalinks**: Ensure WordPress rewrite rules are active (`Settings > Permalinks > Save Changes`). If query parameter mode is preferred, `/?fm_cash_claim=1&t=<token>` works automatically.
- [ ] **Batch Deletion Guards**: A batch cannot be deleted in WP Admin if any claims exist. To cancel an active campaign, set the batch status to `Closed` or `Void` instead of deleting.
