const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const config = require('./config');
const User = require('../../user-service/models/User');

const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

let firebaseCertCache = { certs: {}, expiresAt: 0 };

function extractBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return '';
  return auth.replace('Bearer ', '').trim();
}

function issueAuthTokens(userId) {
  const accessToken = jwt.sign(
    { userId, tokenType: 'access' },
    config.jwtSecret,
    { expiresIn: `${config.accessTokenExpiresSeconds}s` }
  );
  const refreshToken = jwt.sign(
    { userId, tokenType: 'refresh' },
    config.jwtRefreshSecret,
    { expiresIn: `${config.refreshTokenExpiresSeconds}s` }
  );
  return { accessToken, refreshToken };
}

function buildAuthResponse(user, tokens) {
  return {
    token: tokens.accessToken,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: 'bearer',
    expires_in: config.accessTokenExpiresSeconds,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatar_url: user.avatar_url,
    },
  };
}

function verifyBackendAccessToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded?.tokenType && decoded.tokenType !== 'access') return null;
    return decoded.userId;
  } catch {
    return null;
  }
}

function parseCacheMaxAgeSeconds(cacheControl = '') {
  const match = cacheControl.match(/max-age=(\d+)/i);
  if (!match) return 3600;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : 3600;
}

async function getFirebaseCerts() {
  const now = Date.now();
  if (firebaseCertCache.expiresAt > now && Object.keys(firebaseCertCache.certs).length > 0) {
    return firebaseCertCache.certs;
  }

  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`加载 Firebase 公钥失败: HTTP ${response.status}`);
  }

  const certs = await response.json();
  firebaseCertCache = {
    certs: certs && typeof certs === 'object' ? certs : {},
    expiresAt: now + parseCacheMaxAgeSeconds(response.headers.get('cache-control') || '') * 1000,
  };

  return firebaseCertCache.certs;
}

function decodeFirebaseIdTokenForLocalDev(token, reason) {
  if (!config.allowUnverifiedFirebaseTokens) return null;

  const claims = jwt.decode(token);
  if (!claims || typeof claims !== 'object') return null;

  if (claims.aud !== config.firebaseProjectId) return null;
  if (claims.iss !== `https://securetoken.google.com/${config.firebaseProjectId}`) return null;
  if (!claims.email) return null;
  if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) return null;

  console.warn(
    '⚠️ Firebase ID Token 使用本地开发降级解码，未校验签名。请仅在本地开发使用。',
    reason ? `原因: ${reason}` : ''
  );
  return claims;
}

async function verifyFirebaseIdToken(token) {
  if (!token || !config.firebaseProjectId) return null;

  const decodedRaw = jwt.decode(token, { complete: true });
  const kid = decodedRaw?.header?.kid;
  if (!kid) return null;

  let certs;
  try {
    certs = await getFirebaseCerts();
  } catch (error) {
    return decodeFirebaseIdTokenForLocalDev(token, error?.message || '加载 Firebase 公钥失败');
  }

  const cert = certs[kid];
  if (!cert) {
    return decodeFirebaseIdTokenForLocalDev(token, `Firebase 公钥中缺少 kid=${kid}`);
  }

  try {
    const claims = jwt.verify(token, cert, { algorithms: ['RS256'] });
    if (claims.aud !== config.firebaseProjectId) return null;
    if (claims.iss !== `https://securetoken.google.com/${config.firebaseProjectId}`) return null;
    return claims;
  } catch (error) {
    return decodeFirebaseIdTokenForLocalDev(token, error?.message || 'Firebase Token 签名校验失败');
  }
}

function buildBaseUsernameFromEmail(email) {
  const localPart = (email.split('@')[0] || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  let base = localPart.replace(/^_+/, '');
  if (!base || /^\d/.test(base)) {
    base = `user_${base || 'member'}`;
  }
  return base.slice(0, 20);
}

async function generateUniqueUsernameFromEmail(email) {
  const base = buildBaseUsernameFromEmail(email);
  let candidate = base;
  let counter = 1;

  while (await User.findOne({ username: candidate }).select('_id').lean()) {
    const suffix = String(counter);
    candidate = `${base.slice(0, Math.max(1, 20 - suffix.length))}${suffix}`;
    counter += 1;
  }

  return candidate;
}

async function resolveUserIdFromFirebaseClaims(claims) {
  const email = (claims?.email || '').toString().trim().toLowerCase();
  if (!email) return null;

  const name = (claims?.name || '').toString().trim();
  const picture = (claims?.picture || '').toString().trim();

  let user = await User.findOne({ email });
  if (!user) {
    const username = await generateUniqueUsernameFromEmail(email);
    user = await User.create({
      email,
      username,
      name: name || username,
      avatar_url: picture || '',
      passwordHash: undefined,
    });
    return user._id.toString();
  }

  let changed = false;
  if (name && !user.name) {
    user.name = name;
    changed = true;
  }
  if (picture && !user.avatar_url) {
    user.avatar_url = picture;
    changed = true;
  }
  if (changed) {
    await user.save();
  }

  return user._id.toString();
}

async function authRequired(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const backendUserId = verifyBackendAccessToken(token);
    if (backendUserId) {
      req.userId = backendUserId;
      return next();
    }

    const firebaseClaims = await verifyFirebaseIdToken(token);
    if (firebaseClaims) {
      const userId = await resolveUserIdFromFirebaseClaims(firebaseClaims);
      if (userId) {
        req.userId = userId;
        return next();
      }
    }

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    console.error('❌ 鉴权失败:', error?.message || error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

async function optionalAuth(req, _res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      req.userId = null;
      return next();
    }

    const backendUserId = verifyBackendAccessToken(token);
    if (backendUserId) {
      req.userId = backendUserId;
      return next();
    }

    const firebaseClaims = await verifyFirebaseIdToken(token);
    if (firebaseClaims) {
      const userId = await resolveUserIdFromFirebaseClaims(firebaseClaims);
      req.userId = userId || null;
      return next();
    }

    req.userId = null;
    return next();
  } catch (error) {
    console.error('⚠️ 可选鉴权降级为匿名:', error?.message || error);
    req.userId = null;
    return next();
  }
}

async function verifyGoogleToken(googleToken) {
  if (!googleClient) {
    throw new Error('Google登录功能未配置');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: googleToken,
    audience: config.googleClientId,
  });

  return ticket.getPayload();
}

module.exports = {
  authRequired,
  buildAuthResponse,
  config,
  extractBearerToken,
  issueAuthTokens,
  optionalAuth,
  resolveUserIdFromFirebaseClaims,
  verifyBackendAccessToken,
  verifyFirebaseIdToken,
  verifyGoogleToken,
};
