const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PREFERRED_PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_TRIES = 30;
const ROOT = path.resolve(__dirname);
const PORTALS_DIR = path.join(ROOT, 'PORTALS');
const IGNORE_FILES = ['__TEMPLATE__'];

// GitHub config
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'thevibemetaverse/portals';
const GITHUB_DEFAULT_BRANCH = process.env.GITHUB_DEFAULT_BRANCH || 'main';
const [REPO_OWNER, REPO_NAME] = GITHUB_REPO.split('/');

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
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

// ── Portals from PORTALS/ directory ──

let portalsCache = null;
let portalsCacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

function loadPortals() {
  const now = Date.now();
  if (portalsCache && now - portalsCacheTime < CACHE_TTL) return portalsCache;

  try {
    const files = fs.readdirSync(PORTALS_DIR).filter(f =>
      f.endsWith('.json') && !IGNORE_FILES.includes(path.basename(f, '.json'))
    );
    portalsCache = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(PORTALS_DIR, f), 'utf8'));
      return { slug: path.basename(f, '.json'), ...data };
    });
  } catch {
    portalsCache = [];
  }
  portalsCacheTime = now;
  return portalsCache;
}

// ── GitHub API helper ──

function githubApi(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'vibe-portals',
        'Accept': 'application/vnd.github+json',
      },
    };
    if (payload) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Create a PR to register a portal ──

async function createRegistrationPR(slug, portalData) {
  const branchName = `portal/register/${slug}`;
  const filePath = `PORTALS/${slug}.json`;
  const fileContent = JSON.stringify(portalData, null, 2) + '\n';
  const contentBase64 = Buffer.from(fileContent).toString('base64');

  // Check if branch already exists (pending PR)
  const branchCheck = await githubApi(
    'GET',
    `/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${branchName}`
  );
  if (branchCheck.status === 200) {
    return { status: 'pending_review' };
  }

  // Get default branch HEAD SHA
  const refRes = await githubApi(
    'GET',
    `/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${GITHUB_DEFAULT_BRANCH}`
  );
  if (refRes.status !== 200) {
    throw new Error(`Failed to get default branch ref: ${refRes.status}`);
  }
  const baseSha = refRes.data.object.sha;

  // Create branch
  const branchRes = await githubApi(
    'POST',
    `/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
    { ref: `refs/heads/${branchName}`, sha: baseSha }
  );
  if (branchRes.status === 422) {
    // Race condition: branch was created between our check and this call
    return { status: 'pending_review' };
  }
  if (branchRes.status !== 201) {
    throw new Error(`Failed to create branch: ${branchRes.status}`);
  }

  // Create file on branch
  const fileRes = await githubApi(
    'PUT',
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
    {
      message: `Register portal: ${portalData.title}`,
      content: contentBase64,
      branch: branchName,
    }
  );
  if (fileRes.status !== 201) {
    throw new Error(`Failed to create file: ${fileRes.status}`);
  }

  // Open PR
  const prBody = [
    '## New Portal Registration',
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| **URL** | ${portalData.url} |`,
    `| **Title** | ${portalData.title} |`,
    `| **Description** | ${portalData.description || '_(none)_'} |`,
    `| **Portal Image** | ${portalData.portalImageUrl || '_(none)_'} |`,
    `| **Avatar Model** | ${portalData.avatarUrl || '_(none)_'} |`,
    '',
    '_Auto-submitted by the Vibe Portals embed SDK._',
  ].join('\n');

  const prRes = await githubApi(
    'POST',
    `/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
    {
      title: `Register portal: ${portalData.title}`,
      body: prBody,
      head: branchName,
      base: GITHUB_DEFAULT_BRANCH,
    }
  );
  if (prRes.status !== 201) {
    throw new Error(`Failed to create PR: ${prRes.status}`);
  }

  return { status: 'pr_created', prUrl: prRes.data.html_url };
}

// ── Slug helper ──

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

  // POST /api/register — create a GitHub PR to register a portal
  if (req.method === 'POST' && req.url === '/api/register') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
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

        // Already registered on disk?
        const portalFile = path.join(PORTALS_DIR, `${slug}.json`);
        if (fs.existsSync(portalFile)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, slug, status: 'already_registered' }));
          return;
        }

        if (!GITHUB_TOKEN) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'GitHub token not configured' }));
          return;
        }

        // Validate avatarUrl: must be an https:// URL ending in .glb if provided.
        // This value is persisted to disk and served to all clients via portals.json,
        // so we reject anything that isn't a safe model URL.
        const avatarUrl = data.avatarUrl || '';
        if (avatarUrl && (!/^https:\/\/.+\.glb$/i.test(avatarUrl))) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'avatarUrl must be an https:// URL ending in .glb' }));
          return;
        }

        const portalData = {
          url,
          title: data.title || slug,
          description: data.description || '',
          portalImageUrl: data.portalImageUrl || '',
          avatarUrl,
          registeredAt: new Date().toISOString(),
        };

        const result = await createRegistrationPR(slug, portalData);

        const statusCode = result.status === 'pr_created' ? 201 : 200;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, slug, ...result }));
      } catch (err) {
        console.error('Register error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'registration failed' }));
      }
    });
    return;
  }

  // GET /portals.json — serve portals from PORTALS/ directory
  if ((req.method === 'GET' || req.method === 'HEAD') && req.url.split('?')[0] === '/portals.json') {
    const list = loadPortals();
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
