# LVC EcoPack App Hub

Single-page launcher (`index.html`) that links LVC EcoPack's Railway-hosted apps in one place.
Plain HTML/CSS/JS, no build step. Logo is embedded as a base64 JPEG data URI in the header
(source: `Pictures\LVC Logo.jpg`), shown on a white chip so it stays legible in dark mode.

## Apps (defaults in the `SAMPLE` array in the script)
- Claim Form: https://claim-production-a3c4.up.railway.app/ (HR & Admin)
- LVC HR Dashboard: https://lvc-dashboard-production.up.railway.app/ (HR & Admin)

## Notes
- Edits made in the page (Edit → Add / Edit / ✕) are stored in the browser's localStorage under `lvc-app-hub-v3`.
  Bump the key when changing defaults so users see the new list.
- Theme choice is stored under `lvc-app-hub-theme`; otherwise it follows the OS setting.
- Brand colours: lime green and tree grey from the logo; tokens live in `:root` with dark-mode overrides.

## Deploying on Railway
`package.json` makes Railway detect a Node app and run `npm start`, which serves this folder with
`serve` on Railway's `$PORT` (falls back to 3000). No build step.
1. Put this folder in a GitHub repo (or use `railway up` from the Railway CLI).
2. Railway → New Project → Deploy from GitHub repo → pick the repo.
3. Service → Settings → Networking → Generate Domain.
Local run: `npx serve .` then open http://localhost:3000.
