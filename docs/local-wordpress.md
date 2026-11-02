# Local WordPress plugin preview

This runs a separate WordPress 6.8 / PHP 8.3 site with MariaDB 10.11 using
[official Docker images](https://hub.docker.com/_/wordpress). Both repository
plugins are mounted read-only and activated automatically. WordPress files and
database records live in project-specific Docker volumes.

## Start

From the repository root, with Docker running:

```bash
cp -n .env.example .env
# Edit .env and replace both password placeholders with separate random values.
docker compose up -d
docker compose logs setup
```

Wait for setup to finish successfully. The first run may download images.
If `.env` already exists, keep it: it contains your current local passwords and
is excluded from Git. Setup keeps the existing site and account on later runs.

- Admin: <http://localhost:8080/wp-admin/>
- Username: `preview`
- Password: the `WP_ADMIN_PASSWORD` value in your local `.env`.
- Cash dashboard: <http://localhost:8080/wp-admin/admin.php?page=fm-cash-claims>
- Festive Draw: use the **Festive Draw** menu in the WordPress sidebar.

## Try sample coupons

Use only the demo manifests in this local site; their tokens are public examples.

1. Under **Cash Claims → Import Manifest**, upload
   [demo-cash-manifest.csv](demo-cash-manifest.csv), review the preview, then confirm.
2. Open the [Rs. 1,000 demo claim](http://localhost:8080/claim/?t=DEMO_CASH_0000000000000000000001).
   Submit dummy details, then inspect **Cash Claims → Claims & Payouts** and try
   marking the claim paid. The other sample tokens end in `00002` and `00003`.
3. Under **Festive Draw → Import CSV**, upload
   [demo-draw-manifest.csv](demo-draw-manifest.csv).
4. The draw campaign starts on the plugin's first activation date. If you return after
   its four-week window, use **Festive Draw → Settings → Sync Weeks 1–4 to Current
   Month** to start it from today. Then open the
   [demo verification page](http://localhost:8080/verify/?t=DEMO_DRAW_0000000000000000000001).

Each manifest is imported once. A completed demo claim stays redeemed. For a
fresh preview without deleting data, generate a new batch with a different batch
ID and coupon codes.

## Generator app

```bash
bun install
bun run dev --host 127.0.0.1
```

Open <http://localhost:5173>. Set the cash claim base URL to
`http://localhost:8080/claim/`, or the draw verification base URL to
`http://localhost:8080/verify/`. Import each exported manifest into the matching
local plugin before testing its QR link.

## Stop, resume, and inspect

```bash
docker compose stop
docker compose up -d
docker compose ps -a
docker compose logs --tail=100 wordpress setup
```

Stopping keeps local data. Source changes in `plugins/` appear immediately.
The site listens only on this computer; scanning a localhost QR on a phone will
not reach it. Email delivery and real payments are not configured.

Run `python3 test/wordpress-routing.py` while the preview is running to check
that cash and draw routes coexist and local hostnames with ports use HTTP.
Repeated runs count toward the plugins' hourly invalid-scan limits.
