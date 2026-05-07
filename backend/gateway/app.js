const express = require('express');
const jwt = require('jsonwebtoken');
const { URL } = require('url');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = new Set([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
    ]);
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || 'dev-secret-change-me';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const NEWS_SERVICE_URL = process.env.NEWS_SERVICE_URL || 'http://localhost:3002';
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3005';
const AGENT_CONFIG_SERVICE_URL = process.env.AGENT_CONFIG_SERVICE_URL || 'http://localhost:3003';
const SKILL_CONFIG_SERVICE_URL = process.env.SKILL_CONFIG_SERVICE_URL || 'http://localhost:3004';

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    jwt.verify(token, ACCESS_TOKEN_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

async function forwardRequest(req, res, targetBaseUrl, mountPath) {
  try {
    const original = req.originalUrl || req.url;
    const suffix = original.startsWith(mountPath) ? original.slice(mountPath.length) : original;
    const normalizedBase = targetBaseUrl.endsWith('/') ? targetBaseUrl : `${targetBaseUrl}/`;
    const targetUrl = new URL((suffix || '').replace(/^\/+/, ''), normalizedBase);
    const headers = new Headers();

    Object.entries(req.headers).forEach(([key, value]) => {
      if (!value) return;
      const lower = key.toLowerCase();
      if (lower === 'host' || lower === 'content-length') return;
      headers.set(key, value);
    });

    let body;
    if (!['GET', 'HEAD'].includes(req.method)) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(req.body || {});
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';
    res.status(response.status);
    res.set('content-type', contentType);
    return res.send(text);
  } catch (error) {
    console.error('❌ Gateway 转发失败:', error);
    return res.status(502).json({ error: 'Gateway upstream error', details: error.message });
  }
}

app.get('/api/health', async (req, res) => {
  const checks = [
    { name: 'user-service', url: `${USER_SERVICE_URL}/health` },
    { name: 'news-service', url: `${NEWS_SERVICE_URL}/health` },
    { name: 'search-service', url: `${SEARCH_SERVICE_URL}/health` },
    { name: 'agent-config-service', url: `${AGENT_CONFIG_SERVICE_URL}/health` },
    { name: 'skill-config-service', url: `${SKILL_CONFIG_SERVICE_URL}/health` },
  ];

  const services = await Promise.all(
    checks.map(async (service) => {
      try {
        const response = await fetch(service.url);
        return { ...service, ok: response.ok, status: response.status };
      } catch (error) {
        return { ...service, ok: false, status: 0, error: error.message };
      }
    })
  );

  res.json({
    status: services.every((service) => service.ok) ? 'ok' : 'degraded',
    services,
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', (req, res) => forwardRequest(req, res, `${USER_SERVICE_URL}/auth`, '/api/auth'));
app.use('/api/user', (req, res) => forwardRequest(req, res, `${USER_SERVICE_URL}/user`, '/api/user'));
app.use('/api/users', (req, res) => forwardRequest(req, res, `${USER_SERVICE_URL}/user`, '/api/users'));
app.use('/api/tracking', (req, res) => forwardRequest(req, res, `${USER_SERVICE_URL}/tracking`, '/api/tracking'));
app.get('/api/news', (req, res) => forwardRequest(req, res, `${NEWS_SERVICE_URL}/news`, '/api/news'));
app.use('/api/news/search', authenticateToken, (req, res) => forwardRequest(req, res, `${SEARCH_SERVICE_URL}/news/search`, '/api/news/search'));
app.use('/api/search', authenticateToken, (req, res) => forwardRequest(req, res, `${SEARCH_SERVICE_URL}/search`, '/api/search'));
app.use('/api/news', authenticateToken, (req, res) => forwardRequest(req, res, `${NEWS_SERVICE_URL}/news`, '/api/news'));
app.use('/api/ai-search', authenticateToken, (req, res) => forwardRequest(req, res, SEARCH_SERVICE_URL, '/api'));

app.use('/api/agents', authenticateToken, (req, res) => forwardRequest(req, res, `${AGENT_CONFIG_SERVICE_URL}/agents`, '/api/agents'));
app.use('/api/skills', authenticateToken, (req, res) => forwardRequest(req, res, `${SKILL_CONFIG_SERVICE_URL}/skills`, '/api/skills'));

const port = Number(process.env.GATEWAY_PORT || process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`🚪 Gateway service running on port ${port}`);
});
