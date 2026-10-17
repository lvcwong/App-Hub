// LVC App Hub server: serves index.html and a shared app list.
// Anyone can read the list; only the admin (ADMIN_PASSWORD) can change it.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'apps.json');
const INDEX = path.join(__dirname, 'index.html');

const MAX_BODY = 100 * 1024;
const MAX_APPS = 200;
const MAX_FAILS = 10;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

if (!ADMIN_PASSWORD) console.warn('ADMIN_PASSWORD is not set: editing is disabled.');
if (!process.env.DATA_DIR && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  console.warn(`No volume attached: app list is stored in ${DATA_DIR} and resets on redeploy.`);
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const passwordOk = (given) => ADMIN_PASSWORD !== '' && crypto.timingSafeEqual(sha(given), sha(ADMIN_PASSWORD));

// Failed login attempts per IP, to slow down password guessing.
const fails = new Map();
const clientIp = (req) => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
function lockedOut(ip) {
  const f = fails.get(ip);
  if (!f) return false;
  if (Date.now() - f.first > FAIL_WINDOW_MS) { fails.delete(ip); return false; }
  return f.count >= MAX_FAILS;
}
function recordFail(ip) {
  const f = fails.get(ip);
  if (!f || Date.now() - f.first > FAIL_WINDOW_MS) fails.set(ip, { first: Date.now(), count: 1 });
  else f.count++;
}

function readApps() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return null; } // null = no saved list yet, page uses its defaults
}
function writeApps(apps) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(apps, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

const str = (v, max) => typeof v === 'string' && v.length <= max;
function validApps(apps) {
  if (!Array.isArray(apps) || apps.length > MAX_APPS) return false;
  return apps.every(a => a && typeof a === 'object' &&
    str(a.id, 40) && a.id && str(a.name, 60) && a.name.trim() &&
    str(a.category, 40) && str(a.desc ?? '', 120) &&
    str(a.url, 2000) && /^https?:\/\//i.test(a.url));
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Checks the admin password sent as "Authorization: Bearer <password>".
function authorize(req, res) {
  const ip = clientIp(req);
  if (!ADMIN_PASSWORD) { send(res, 403, { error: 'Editing is disabled on this server.' }); return false; }
  if (lockedOut(ip)) { send(res, 429, { error: 'Too many wrong passwords. Try again in 15 minutes.' }); return false; }
  const given = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!passwordOk(given)) { recordFail(ip); send(res, 401, { error: 'Wrong password.' }); return false; }
  fails.delete(ip);
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
      return send(res, 200, fs.readFileSync(INDEX), 'text/html; charset=utf-8');
    }

    if (url.pathname === '/api/apps') {
      if (req.method === 'GET') return send(res, 200, { apps: readApps() });
      if (req.method === 'PUT') {
        if (!authorize(req, res)) return;
        let apps;
        try { apps = JSON.parse(await readBody(req)); } catch { return send(res, 400, { error: 'Invalid JSON.' }); }
        if (!validApps(apps)) return send(res, 400, { error: 'Invalid app list.' });
        writeApps(apps);
        return send(res, 200, { apps });
      }
      if (req.method === 'DELETE') {
        if (!authorize(req, res)) return;
        fs.rmSync(DATA_FILE, { force: true });
        return send(res, 200, { apps: null });
      }
      return send(res, 405, { error: 'Method not allowed' });
    }

    if (url.pathname === '/api/login' && req.method === 'POST') {
      if (!authorize(req, res)) return;
      return send(res, 200, { ok: true });
    }

    send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  } catch (err) {
    console.error(err);
    send(res, 500, { error: 'Server error.' });
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`App Hub listening on ${PORT}`));
