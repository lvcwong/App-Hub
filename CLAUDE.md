# LVC EcoPack App Hub

Launcher page (`index.html`) that links LVC EcoPack's Railway-hosted apps in one place, served by a
tiny dependency-free Node server (`server.js`). No build step.
Logo is embedded as a base64 JPEG data URI in the header (source: `Pictures\LVC Logo.jpg`),
shown on a white chip so it stays legible in dark mode.

Live: https://app-hub-production-4623.up.railway.app/ (Railway project `desirable-art`, repo lvcwong/App-Hub).

## Apps (defaults in the `SAMPLE` array in the page script)
- Claim Form: https://claim-production-a3c4.up.railway.app/ (HR & Admin)
- LVC HR Dashboard: https://lvc-dashboard-production.up.railway.app/ (HR & Admin)

## Viewing vs editing
- Everyone can view. Only the admin can edit: 🔒 Admin → password → Add / Edit / ✕ / Reset.
- The password is the `ADMIN_PASSWORD` Railway variable. If it is unset, editing is disabled.
  It is checked on the server; the page keeps it in sessionStorage (cleared when the tab closes).
- 10 wrong passwords from one IP lock that IP out for 15 minutes.
- The shared list is saved to `apps.json` in the Railway volume (`RAILWAY_VOLUME_MOUNT_PATH`),
  or `DATA_DIR`, or `./data` locally. Without a volume it resets on every redeploy.
  No saved file = the page shows `SAMPLE`; Reset deletes the file.

## API (server.js)
- `GET /api/apps` → `{ apps: [...] | null }` (public)
- `PUT /api/apps` (JSON array) / `DELETE /api/apps` / `POST /api/login` need `Authorization: Bearer <password>`.
- Only `/` and `/index.html` are served as files, so this doc and package.json stay private.

## Notes
- Theme choice is stored under localStorage `lvc-app-hub-theme`; otherwise it follows the OS setting.
- Brand colours: lime green and tree grey from the logo; tokens live in `:root` with dark-mode overrides.
- Local run (needs Node 18+): `ADMIN_PASSWORD=test node server.js`, then http://localhost:3000.
- Railway runs `npm start` on every push to `main`.
