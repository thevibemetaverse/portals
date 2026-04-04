const http = require('http');
const fs = require('fs');
const path = require('path');

const PREFERRED_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_TRIES = 30;
const ROOT = path.resolve(__dirname);
const REGISTERED_FILE = path.join(ROOT, 'registered.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// ── Registered games storage ──

function loadRegistered() {
  try {
    return JSON.parse(fs.readFileSync(REGISTERED_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveRegistered(data) {
  fs.writeFileSync(REGISTERED_FILE, JSON.stringify(data, null, 2));
}

function slugFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase();
  } catch {
    return null;
  }
}

// ── CORS ──

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Static file resolution ──

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const rel = decoded === '/' ? 'index.html' : decoded.replace(/^\//, '');
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) return null;
  return full;
}

// ── Request handler ──

const server = http.createServer((req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /api/register — auto-register a game
  if (req.method === 'POST' && req.url === '/api/register') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const url = data.url;
        if (!url || typeof url !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'url is required' }));
          return;
        }

        const slug = slugFromUrl(url);
        if (!slug) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid url' }));
          return;
        }

        const registered = loadRegistered();
        registered[slug] = {
          slug,
          url,
          title: data.title || slug,
          description: data.description || '',
          portalImageUrl: data.portalImageUrl || '',
          registeredAt: registered[slug]?.registeredAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveRegistered(registered);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, slug }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON' }));
      }
    });
    return;
  }

  // GET /portals.json — serve registered games
  if ((req.method === 'GET' || req.method === 'HEAD') && req.url.split('?')[0] === '/portals.json') {
    const registered = loadRegistered();
    const list = Object.values(registered);
    const json = JSON.stringify(list, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    if (req.method === 'HEAD') { res.end(); return; }
    res.end(json);
    return;
  }

  // Static files
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }

  const filePath = safeFilePath(req.url);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    if (req.method === 'HEAD') {
      res.writeHead(200);
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
});

function listenWithFallback(port, triesLeft) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && triesLeft > 1) {
      listenWithFallback(port + 1, triesLeft - 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    if (port !== PREFERRED_PORT) {
      console.log(
        `Port ${PREFERRED_PORT} is already in use; listening on ${port} instead.`
      );
    }
    console.log(`Serving ${ROOT}`);
    console.log(`http://localhost:${port}`);
  });
}

listenWithFallback(PREFERRED_PORT, MAX_PORT_TRIES);
