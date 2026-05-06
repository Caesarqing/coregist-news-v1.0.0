// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const News = require('../models/News');
const User = require('../models/User');
const UserNewsState = require('../models/UserNewsState');
const TrackingTopic = require('../models/TrackingTopic');
const { buildNewsIdentity, buildNewsLookupQuery } = require('../services/shared/node/news-identity');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'coregistnews-news';
const ACCESS_TOKEN_EXPIRES_SECONDS = Number(process.env.ACCESS_TOKEN_EXPIRES_SECONDS) || 7 * 24 * 60 * 60;
const REFRESH_TOKEN_EXPIRES_SECONDS = Number(process.env.REFRESH_TOKEN_EXPIRES_SECONDS) || 30 * 24 * 60 * 60;
const RESET_CODE_EXPIRES_MINUTES = Number(process.env.RESET_CODE_EXPIRES_MINUTES) || 10;

// 初始化Google OAuth客户端
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// 中间件
app.use(cors());            // 允许跨域（方便前端直接访问）
app.use(express.json());    // 让 Express 能解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 兼容 application/x-www-form-urlencoded

function issueAuthTokens(userId) {
  const accessToken = jwt.sign(
    { userId, tokenType: 'access' },
    JWT_SECRET,
    { expiresIn: `${ACCESS_TOKEN_EXPIRES_SECONDS}s` }
  );
  const refreshToken = jwt.sign(
    { userId, tokenType: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_TOKEN_EXPIRES_SECONDS}s` }
  );
  return { accessToken, refreshToken };
}

function buildAuthResponse(user, tokens) {
  return {
    token: tokens.accessToken, // 兼容旧前端字段
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    token_type: 'bearer',
    expires_in: ACCESS_TOKEN_EXPIRES_SECONDS,
    user: {
      id: user._id,
      email: user.email,
      username: user.username,
      name: user.name,
      avatar_url: user.avatar_url,
    },
  };
}

function splitKeywords(raw) {
  const text = (raw || '').toString().trim();
  if (!text) return [];
  return text
    .split(/[;；,，]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPreferredLanguage(req, userLanguage = '') {
  const queryLang = (req.query.lang || '').toString();
  if (queryLang === 'zh-CN' || queryLang === 'en') return queryLang;
  if (userLanguage === 'zh-CN' || userLanguage === 'en') return userLanguage;
  const acceptLanguage = (req.headers['accept-language'] || '').toLowerCase();
  return acceptLanguage.includes('zh') ? 'zh-CN' : 'en';
}

const RECENT_NEWS_SORT = { processed_at: -1, crawledAt: -1, postedAt: -1, _id: -1 };

function mapNewsDoc(doc, language = 'zh-CN') {
  const raw = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  if (!raw) return null;

  const isZh = language === 'zh-CN';
  const title = isZh ? (raw.title_zh || raw.title_en || '') : (raw.title_en || raw.title_zh || '');
  const summary = isZh ? (raw.summary_zh || raw.summary_en || '') : (raw.summary_en || raw.summary_zh || '');
  const category = isZh ? (raw.level1_name_zh || raw.level1_name_en || '') : (raw.level1_name_en || raw.level1_name_zh || '');
  const source = isZh ? (raw.source_zh || raw.source_en || '') : (raw.source_en || raw.source_zh || '');
  const keywords = isZh
    ? (raw.tags_zh && raw.tags_zh.length ? raw.tags_zh : raw.tags_en || [])
    : (raw.tags_en && raw.tags_en.length ? raw.tags_en : raw.tags_zh || []);

  return {
    ...raw,
    id: raw._id ? raw._id.toString() : (raw.id || ''),
    title,
    summary,
    fullContent: summary,
    category,
    publishTime: raw.postedAt || raw.processed_at || raw.crawledAt || null,
    source,
    sourceLink: raw.link || '',
    imageUrl: raw.image_link || '',
    keywords,
  };
}

function sanitizeStringArray(value, maxItems = 50) {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((v) => (v ?? '').toString().trim())
    .filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, maxItems);
}

function buildTopicNewsQuery({ keywords = [], urls = [] } = {}) {
  const keywordList = sanitizeStringArray(keywords, 50);
  const urlList = sanitizeStringArray(urls, 20);
  const clauses = [];

  if (keywordList.length > 0) {
    const regex = keywordList.map((k) => new RegExp(escapeRegex(k), 'i'));
    clauses.push({
      $or: [
        { tags_zh: { $in: keywordList } },
        { tags_en: { $in: keywordList } },
        { title_zh: { $in: regex } },
        { title_en: { $in: regex } },
        { summary_zh: { $in: regex } },
        { summary_en: { $in: regex } },
      ],
    });
  }

  if (urlList.length > 0) {
    clauses.push({ link: { $in: urlList } });
  }

  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

function mapTrackingTopic(topic, newsCount = 0) {
  return {
    id: topic._id?.toString() || topic.id || '',
    name: topic.name || '',
    keywords: topic.keywords || [],
    urls: topic.urls || [],
    newsCount,
    createdAt: topic.createdAt
      ? new Date(topic.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let firebaseCertCache = { certs: {}, expiresAt: 0 };

function extractBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return '';
  return auth.replace('Bearer ', '').trim();
}

function verifyBackendAccessToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded?.tokenType && decoded.tokenType !== 'access') return null;
    return decoded.userId;
  } catch {
    return null;
  }
}

function getUserIdFromToken(req) {
  const token = extractBearerToken(req);
  return verifyBackendAccessToken(token);
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
  const maxAgeSeconds = parseCacheMaxAgeSeconds(response.headers.get('cache-control') || '');
  firebaseCertCache = {
    certs: certs && typeof certs === 'object' ? certs : {},
    expiresAt: now + maxAgeSeconds * 1000,
  };

  return firebaseCertCache.certs;
}

async function verifyFirebaseIdToken(token) {
  if (!token || !FIREBASE_PROJECT_ID) return null;

  const decodedRaw = jwt.decode(token, { complete: true });
  const kid = decodedRaw?.header?.kid;
  if (!kid) return null;

  const certs = await getFirebaseCerts();
  const cert = certs[kid];
  if (!cert) return null;

  try {
    const claims = jwt.verify(token, cert, { algorithms: ['RS256'] });
    if (claims.aud !== FIREBASE_PROJECT_ID) return null;
    if (claims.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;
    return claims;
  } catch {
    return null;
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
      pushSettings: {
        pushDays: ['monday', 'wednesday', 'friday'],
        pushTimes: ['08:00', '18:00'],
        pushCount: 5,
        everyday: false,
        keywords: [],
      },
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
  } catch (err) {
    console.error('❌ 鉴权失败:', err?.message || err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// 连接 MongoDB
const mongoOptions = {
  serverSelectionTimeoutMS: 5000, // 5秒超时
  socketTimeoutMS: 45000, // 45秒socket超时
  connectTimeoutMS: 10000, // 10秒连接超时
  maxPoolSize: 10, // 连接池大小
  minPoolSize: 1,
  retryWrites: true,
};

// 检查 MONGODB_URI 是否存在
if (!process.env.MONGODB_URI) {
  console.error('❌ 错误: MONGODB_URI 环境变量未设置！');
  console.error('请检查 backend/.env 文件是否存在并包含 MONGODB_URI');
  process.exit(1);
}

console.log('🔌 正在连接 MongoDB...');
console.log('📍 连接地址:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // 隐藏密码

mongoose.connect(process.env.MONGODB_URI, mongoOptions)
  .then(() => {
    console.log('✅ MongoDB 连接成功');
    console.log('📊 数据库:', mongoose.connection.db.databaseName);
  })
  .catch((err) => {
    console.error('❌ MongoDB 连接失败:', err.message);
    console.error('💡 请检查:');
    console.error('   1. MongoDB 服务是否运行: sudo systemctl status mongod');
    console.error('   2. 连接字符串是否正确: 检查 backend/.env 文件中的 MONGODB_URI');
    console.error('   3. 防火墙是否允许 27017 端口');
    console.error('   4. 如果使用认证，用户名和密码是否正确');
    process.exit(1); // 连接失败时退出应用
  });

// 监听连接事件
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB 连接错误:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB 连接断开');
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// 用户名验证工具
const { validateUsername } = require('../utils/usernameValidator');

// 检查用户名是否可用
app.get('/api/auth/check-username', async (req, res) => {
  try {
    const username = (req.query.username || '').toString().trim().toLowerCase();
    console.log('🔍 检查用户名可用性:', username);
    
    if (!username) {
      return res.status(400).json({ available: false, reason: 'USERNAME_EMPTY' });
    }

    // 验证用户名格式
    let validation;
    try {
      validation = validateUsername(username);
    } catch (validationError) {
      console.error('❌ 用户名验证函数出错:', validationError);
      console.error('错误堆栈:', validationError.stack);
      return res.status(500).json({ available: false, reason: 'USERNAME_VALIDATION_ERROR' });
    }

    if (!validation || !validation.valid) {
      console.log('❌ 用户名验证失败:', validation?.reason || '未知原因');
      return res.json({ available: false, reason: validation?.reason || 'USERNAME_VALIDATION_ERROR' });
    }

    // 检查用户名是否已存在
    const existing = await User.findOne({ username });
    if (existing) {
      console.log('❌ 用户名已被使用:', username);
      return res.json({ available: false, reason: 'USERNAME_TAKEN' });
    }

    console.log('✅ 用户名可用:', username);
    return res.json({ available: true });
  } catch (err) {
    console.error('❌ 检查用户名错误:', err);
    console.error('错误堆栈:', err.stack);
      res.status(500).json({ available: false, reason: 'USERNAME_VALIDATION_ERROR' });
  }
});

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('🆕 收到注册请求:', JSON.stringify(req.body));

    const email = (req.body?.email || '').toString().trim().toLowerCase();
    const password = (req.body?.password || '').toString();
    const username = (req.body?.username || '').toString().trim().toLowerCase();
    const name = (req.body?.name || req.body?.fullName || '').toString();

    if (!email || !password) {
      console.log('❌ 注册失败：缺少 email 或 password');
      return res.status(400).json({ error: 'email 和 password 不能为空' });
    }

    if (!username) {
      console.log('❌ 注册失败：缺少 username');
      return res.status(400).json({ error: 'USERNAME_EMPTY' });
    }

    // 验证用户名格式（包括脏话和名人检查）
    console.log('🔍 开始验证用户名:', username);
    const usernameValidation = validateUsername(username);
    console.log('🔍 验证结果:', JSON.stringify(usernameValidation));
    if (!usernameValidation.valid) {
      console.log('❌ 注册失败：用户名验证失败:', usernameValidation.reason);
      return res.status(400).json({ error: usernameValidation.reason });
    }
    console.log('✅ 用户名验证通过');

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log('❌ 注册失败：邮箱已存在');
      return res.status(409).json({ error: 'EMAIL_TAKEN' });
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.log('❌ 注册失败：用户名已存在');
      return res.status(409).json({ error: 'USERNAME_TAKEN' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    console.log('💾 准备创建用户，username:', username);
    const user = await User.create({
      email,
      username: username, // 确保username被保存
      name: name || '',
      passwordHash,
      // 设置默认的推送设置
      pushSettings: {
        pushDays: ['monday', 'wednesday', 'friday'],
        pushTimes: ['08:00', '18:00'],
        pushCount: 5,
        everyday: false,
        keywords: [],
      },
    });

    const tokens = issueAuthTokens(user._id);
    console.log('✅ 注册成功:', user.email, user.username);
    res.status(201).json(buildAuthResponse(user, tokens));
  } catch (err) {
    console.error('❌ 注册错误:', err);
    // 处理唯一性约束错误
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      if (field === 'email') {
        return res.status(409).json({ error: 'EMAIL_TAKEN' });
      } else if (field === 'username') {
        return res.status(409).json({ error: 'USERNAME_TAKEN' });
      }
    }
    res.status(500).json({ error: '注册失败', details: err.message });
  }
});

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 收到登录请求');
    console.log('请求体:', JSON.stringify(req.body));
    
    const email = (req.body?.email || req.body?.username || '').toString().trim().toLowerCase();
    const password = (req.body?.password || '').toString();
    
    if (!email || !password) {
      console.log('❌ 邮箱或密码为空');
      return res.status(400).json({ error: 'email 和 password 不能为空' });
    }

    console.log(`🔍 查找用户: ${email}`);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ 用户不存在');
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // OAuth用户没有密码，不能使用密码登录
    if (!user.passwordHash) {
      console.log('❌ 该用户使用OAuth登录，不能使用密码登录');
      return res.status(401).json({ error: '该账户使用第三方登录，请使用Google登录' });
    }

    console.log('✅ 找到用户，验证密码...');
    const ok = await bcrypt.compare(password, user.passwordHash);
    
    if (!ok) {
      console.log('❌ 密码错误');
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    console.log('✅ 密码验证通过，生成 token...');
    const tokens = issueAuthTokens(user._id);
    
    console.log('✅ 登录成功');
    res.json(buildAuthResponse(user, tokens));
  } catch (err) {
    console.error('❌ 登录错误:', err);
    console.error('错误堆栈:', err.stack);
    res.status(500).json({ error: '登录失败', details: err.message });
  }
});

// 刷新 token（前端传 refresh_token）
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = (req.body?.refresh_token || '').toString().trim();
    if (!refreshToken) {
      return res.status(400).json({ error: 'refresh_token 不能为空' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (verifyError) {
      return res.status(401).json({ error: 'refresh_token 无效或已过期' });
    }

    if (decoded?.tokenType && decoded.tokenType !== 'refresh') {
      return res.status(401).json({ error: 'refresh_token 类型错误' });
    }

    const user = await User.findById(decoded.userId).select('email username name avatar_url');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const tokens = issueAuthTokens(user._id);
    res.json(buildAuthResponse(user, tokens));
  } catch (err) {
    console.error('❌ 刷新 token 失败:', err);
    res.status(500).json({ error: '刷新 token 失败' });
  }
});

// 发送重置密码验证码（邮箱）
app.post('/api/auth/send-reset-code', async (req, res) => {
  try {
    const method = (req.body?.method || 'email').toString();
    const email = (req.body?.email || '').toString().trim().toLowerCase();

    if (method !== 'email') {
      return res.status(400).json({ error: '仅支持邮箱重置' });
    }
    if (!email) {
      return res.status(400).json({ error: 'email 不能为空' });
    }

    // 生成 6 位验证码（目前仅控制台输出，后续可对接真实邮件服务）
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRES_MINUTES * 60 * 1000);

    const user = await User.findOne({ email });
    if (user) {
      user.resetPasswordCodeHash = codeHash;
      user.resetPasswordCodeExpiresAt = expiresAt;
      await user.save();

      console.log(`📨 重置密码验证码（开发环境） email=${email} code=${code} expiresAt=${expiresAt.toISOString()}`);
    } else {
      // 防止邮箱枚举攻击：即便用户不存在也返回成功
      console.log(`📨 重置密码请求（用户不存在也返回成功） email=${email}`);
    }

    res.json({ message: '验证码已发送（如邮箱存在）' });
  } catch (err) {
    console.error('❌ 发送重置验证码失败:', err);
    res.status(500).json({ error: '发送验证码失败' });
  }
});

// 通过验证码重置密码
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const method = (req.body?.method || 'email').toString();
    const email = (req.body?.email || '').toString().trim().toLowerCase();
    const code = (req.body?.code || '').toString().trim();
    const newPassword = (req.body?.new_password || '').toString();

    if (method !== 'email') {
      return res.status(400).json({ error: '仅支持邮箱重置' });
    }
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'email、code、new_password 不能为空' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: '新密码长度至少 8 位' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordCodeHash || !user.resetPasswordCodeExpiresAt) {
      return res.status(400).json({ error: '验证码无效或已过期' });
    }
    if (user.resetPasswordCodeExpiresAt.getTime() < Date.now()) {
      user.resetPasswordCodeHash = null;
      user.resetPasswordCodeExpiresAt = null;
      await user.save();
      return res.status(400).json({ error: '验证码无效或已过期' });
    }

    const isCodeValid = await bcrypt.compare(code, user.resetPasswordCodeHash);
    if (!isCodeValid) {
      return res.status(400).json({ error: '验证码错误' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordCodeHash = null;
    user.resetPasswordCodeExpiresAt = null;
    await user.save();

    res.json({ message: '密码重置成功' });
  } catch (err) {
    console.error('❌ 重置密码失败:', err);
    res.status(500).json({ error: '重置密码失败' });
  }
});

// Google OAuth登录
app.post('/api/auth/google', async (req, res) => {
  try {
    console.log('🔐 收到Google登录请求');
    const { token: googleToken } = req.body;
    
    if (!googleToken) {
      return res.status(400).json({ error: '缺少Google token' });
    }

    if (!googleClient) {
      console.error('❌ Google OAuth未配置，请设置GOOGLE_CLIENT_ID环境变量');
      return res.status(500).json({ error: 'Google登录功能未配置' });
    }

    // 验证Google token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: googleToken,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch (verifyError) {
      console.error('❌ Google token验证失败:', verifyError);
      return res.status(401).json({ error: 'Google token验证失败' });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Google账户缺少邮箱信息' });
    }

    console.log(`🔍 查找或创建Google用户: ${email}, googleId: ${googleId}`);

    // 查找用户：优先通过googleId，其次通过email
    let user = await User.findOne({ 
      $or: [
        { googleId },
        { email: email.toLowerCase() }
      ]
    });

    if (user) {
      // 如果用户存在但没有googleId，更新它
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture) user.avatar_url = picture;
        await user.save();
      }
      console.log('✅ 找到现有用户，直接登录');
    } else {
      // 创建新用户
      // 生成唯一的username（基于email）
      let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let baseUsername = username;
      let counter = 1;
      
      // 确保username唯一
      while (await User.findOne({ username })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      console.log(`🆕 创建新Google用户: ${email}, username: ${username}`);
      user = await User.create({
        email: email.toLowerCase(),
        username,
        name: name || '',
        googleId,
        avatar_url: picture || '',
        passwordHash: undefined, // OAuth用户不需要密码
        pushSettings: {
          pushDays: ['monday', 'wednesday', 'friday'],
          pushTimes: ['08:00', '18:00'],
          pushCount: 5,
          everyday: false,
          keywords: [],
        },
      });
      console.log('✅ 新用户创建成功');
    }

    const tokens = issueAuthTokens(user._id);
    
    console.log('✅ Google登录成功');
    res.json(buildAuthResponse(user, tokens));
  } catch (err) {
    console.error('❌ Google登录错误:', err);
    console.error('错误堆栈:', err.stack);
    res.status(500).json({ error: 'Google登录失败', details: err.message });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('email username name bio phone birthday avatar_url pushSettings language createdAt updatedAt');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({
      id: user._id,
      email: user.email,
      username: user.username || '',
      name: user.name || '',
      bio: user.bio || '',
      phone: user.phone || '',
      birthday: user.birthday || '',
      avatar: user.avatar_url || '',
      avatar_url: user.avatar_url || '',
      pushSettings: user.pushSettings,
      language: user.language,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error('❌ 获取用户信息错误:', err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新用户基本信息（name 和 bio）
// 注意：邮箱和用户名不能通过此接口修改
app.put('/api/user/profile', authRequired, async (req, res) => {
  try {
    const { name, bio, email, username, phone, birthday, avatar, avatar_url: avatarUrl } = req.body || {};
    
    // 明确拒绝尝试修改邮箱或用户名的请求
    if (email !== undefined) {
      return res.status(400).json({ error: '邮箱不能修改' });
    }
    if (username !== undefined) {
      return res.status(400).json({ error: '用户名不能修改' });
    }
    
    const updateData = {};
    if (name !== undefined) {
      updateData.name = (name || '').toString().trim();
    }
    if (bio !== undefined) {
      updateData.bio = (bio || '').toString().trim();
    }
    if (phone !== undefined) {
      updateData.phone = (phone || '').toString().trim();
    }
    if (birthday !== undefined) {
      updateData.birthday = (birthday || '').toString().trim();
    }
    if (avatar !== undefined || avatarUrl !== undefined) {
      updateData.avatar_url = (avatarUrl ?? avatar ?? '').toString().trim();
    }
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('email username name bio phone birthday avatar_url pushSettings createdAt updatedAt');

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      id: user._id,
      email: user.email,
      username: user.username || '',
      name: user.name || '',
      bio: user.bio || '',
      phone: user.phone || '',
      birthday: user.birthday || '',
      avatar: user.avatar_url || '',
      avatar_url: user.avatar_url || '',
      pushSettings: user.pushSettings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    console.error('❌ 更新用户信息错误:', err);
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 修改密码
app.post('/api/auth/change-password', authRequired, async (req, res) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password 和 new_password 不能为空' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    if (!user.passwordHash) {
      return res.status(400).json({ error: '当前账户未设置密码，请使用忘记密码流程设置密码' });
    }

    const ok = await bcrypt.compare(current_password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: '当前密码不正确' });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    user.passwordHash = passwordHash;
    await user.save();

    res.json({ message: '密码修改成功' });
  } catch (err) {
    console.error('❌ 修改密码错误:', err);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// 获取新闻列表（支持分页），并根据用户状态过滤已读/隐藏
app.get('/api/news', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const category = (req.query.category || '').toString().trim();
    const keywords = splitKeywords(req.query.keywords);

    // 支持按分类筛选
    const level1_code = req.query.level1_code;
    const level2_code = req.query.level2_code;

    // 构建查询条件
    const query = {};
    const andClauses = [];

    if (level1_code) {
      query.level1_code = level1_code;
    }
    if (level2_code) {
      query.level2_codes = level2_code;
    }
    if (category) {
      const categoryRegex = new RegExp(escapeRegex(category), 'i');
      andClauses.push({
        $or: [
          { level1_code: category },
          { level1_name_zh: categoryRegex },
          { level1_name_en: categoryRegex },
        ],
      });
    }
    if (keywords.length > 0) {
      const keywordRegexes = keywords.map((k) => new RegExp(escapeRegex(k), 'i'));
      andClauses.push({
        $or: [
          { tags_zh: { $in: keywords } },
          { tags_en: { $in: keywords } },
          { title_zh: { $in: keywordRegexes } },
          { title_en: { $in: keywordRegexes } },
          { summary_zh: { $in: keywordRegexes } },
          { summary_en: { $in: keywordRegexes } },
        ],
      });
    }
    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    // 若用户已登录，过滤已读/隐藏的新闻
    const userId = getUserIdFromToken(req);
    let userLanguage = '';
    if (userId) {
      const states = await UserNewsState.find({
        userId,
        status: { $in: ['read', 'hidden'] },
      }).select('newsId').lean();
      const excludeIds = states.map((s) => s.newsId);
      if (excludeIds.length > 0) {
        query._id = { $nin: excludeIds };
      }

      const user = await User.findById(userId).select('language').lean();
      userLanguage = user?.language || '';
    }
    const preferredLanguage = getPreferredLanguage(req, userLanguage);

    const [items, total] = await Promise.all([
      News.find(query)
        .sort(RECENT_NEWS_SORT)
        .skip(skip)
        .limit(limit),
      News.countDocuments(query)
    ]);

    // 调试日志：检查返回的新闻来源分布
    if (items.length > 0) {
      const sourceCounts = {};
      items.forEach(item => {
        const source = item.source_en || item.source_zh || 'unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      console.log(`📰 第${page}页新闻来源分布:`, sourceCounts);
      console.log(`📰 总新闻数: ${total}, 当前页: ${items.length}条`);
    }

    // 如果是第一页，额外检查数据库中所有新闻源的分布
    if (page === 1) {
      const allSources = await News.aggregate([
        { $group: { _id: { $ifNull: ['$source_en', '$source_zh'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      console.log(`📊 数据库中所有新闻源分布:`, allSources);
    }

    const mappedItems = items.map((item) => mapNewsDoc(item, preferredLanguage)).filter(Boolean);
    res.json({ page, limit, total, items: mappedItems });
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户推送设置
app.get('/api/user/settings', authRequired, async (req, res) => {
  try {
    console.log('📖 收到获取设置请求，用户ID:', req.userId);
    const user = await User.findById(req.userId).select('pushSettings language');
    if (!user) {
      console.log('❌ 用户不存在');
      return res.status(404).json({ error: '用户不存在' });
    }

    const settings = user.pushSettings || {
      pushDays: ['monday', 'wednesday', 'friday'],
      pushTimes: ['08:00', '18:00'],
      pushCount: 5,
      everyday: false,
      keywords: [],
    };

    console.log('✅ 返回设置:', JSON.stringify(settings));
    res.json({
      pushSettings: settings,
      language: user.language || 'zh-CN',
    });
  } catch (err) {
    console.error('❌ 获取设置错误:', err);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 更新用户推送设置
app.put('/api/user/settings', authRequired, async (req, res) => {
  try {
    console.log('💾 收到更新设置请求');
    console.log('用户ID:', req.userId);
    console.log('请求体:', JSON.stringify(req.body));
    
    const { pushSettings, language } = req.body || {};
    
    // 构建更新对象
    const updateData = {};
    
    if (pushSettings) {
    // 验证/转换数据格式
    const toStringArray = (v) =>
      Array.isArray(v) ? v.map((x) => (x ?? '').toString()).filter(Boolean) : [];

    const parsedPushCount = Number(pushSettings.pushCount);
    const pushCount = Number.isFinite(parsedPushCount)
      ? Math.max(1, Math.min(20, parsedPushCount))
      : 5;

      updateData.pushSettings = {
      pushDays: toStringArray(pushSettings.pushDays),
      pushTimes: toStringArray(pushSettings.pushTimes),
      pushCount,
      everyday: typeof pushSettings.everyday === 'boolean' ? pushSettings.everyday : false,
      keywords: toStringArray(pushSettings.keywords),
    };
    }
    
    // 更新语言设置
    if (language && (language === 'zh-CN' || language === 'en')) {
      updateData.language = language;
    }

    console.log('✅ 验证后的设置:', JSON.stringify(updateData));

    // 使用 $set 操作符确保嵌套对象正确更新
    const updateQuery = { $set: updateData };
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      updateQuery,
      { new: true, runValidators: true }
    ).select('email username pushSettings language');

    if (!user) {
      console.log('❌ 用户不存在');
      return res.status(404).json({ error: '用户不存在' });
    }

    console.log('✅ 设置已保存');
    console.log('✅ 保存后的用户设置:', JSON.stringify(user.pushSettings));
    
    const response = { ok: true };
    if (pushSettings) {
      response.pushSettings = user.pushSettings || {
        pushDays: [],
        pushTimes: [],
        pushCount: 5,
        everyday: false,
        keywords: []
      };
    }
    if (language) {
      response.language = user.language;
    }
    res.json(response);
  } catch (err) {
    console.error('❌ 更新设置错误:', err);
    console.error('错误堆栈:', err.stack);
    res.status(500).json({ error: '更新设置失败', details: err.message });
  }
});

// 获取定向追踪主题
app.get('/api/tracking/topics', authRequired, async (req, res) => {
  try {
    const topics = await TrackingTopic.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    const mapped = await Promise.all(
      topics.map(async (topic) => {
        const query = buildTopicNewsQuery(topic);
        const newsCount = Object.keys(query).length > 0
          ? await News.countDocuments(query)
          : 0;
        return mapTrackingTopic(topic, newsCount);
      })
    );

    res.json({ items: mapped, total: mapped.length });
  } catch (err) {
    console.error('❌ 获取追踪主题失败:', err);
    res.status(500).json({ error: '获取追踪主题失败' });
  }
});

// 新增定向追踪主题
app.post('/api/tracking/topics', authRequired, async (req, res) => {
  try {
    const name = (req.body?.name || '').toString().trim();
    if (!name) {
      return res.status(400).json({ error: '主题名称不能为空' });
    }

    const keywords = Array.isArray(req.body?.keywords)
      ? sanitizeStringArray(req.body.keywords, 50)
      : splitKeywords(req.body?.keywords);
    const urls = sanitizeStringArray(req.body?.urls, 20);

    const topic = await TrackingTopic.create({
      userId: req.userId,
      name,
      keywords,
      urls,
    });

    const newsCount = Object.keys(buildTopicNewsQuery(topic)).length > 0
      ? await News.countDocuments(buildTopicNewsQuery(topic))
      : 0;
    res.status(201).json(mapTrackingTopic(topic, newsCount));
  } catch (err) {
    console.error('❌ 新增追踪主题失败:', err);
    res.status(500).json({ error: '新增追踪主题失败' });
  }
});

// 删除定向追踪主题
app.delete('/api/tracking/topics/:id', authRequired, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }

    const result = await TrackingTopic.deleteOne({ _id: id, userId: req.userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '追踪主题不存在' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ 删除追踪主题失败:', err);
    res.status(500).json({ error: '删除追踪主题失败' });
  }
});

// 获取主题相关新闻时间线
app.get('/api/tracking/topics/:id/news', authRequired, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid topic id' });
    }

    const topic = await TrackingTopic.findOne({ _id: id, userId: req.userId }).lean();
    if (!topic) {
      return res.status(404).json({ error: '追踪主题不存在' });
    }

    const query = buildTopicNewsQuery(topic);
    if (Object.keys(query).length === 0) {
      return res.json({ topic: mapTrackingTopic(topic, 0), items: [], total: 0 });
    }

    let limit = Number(req.query.limit) || 50;
    if (Number.isNaN(limit) || limit <= 0) limit = 50;
    if (limit > 100) limit = 100;

    const user = await User.findById(req.userId).select('language').lean();
    const preferredLanguage = getPreferredLanguage(req, user?.language || '');
    const newsDocs = await News.find(query)
      .sort(RECENT_NEWS_SORT)
      .limit(limit);

    const mappedNews = newsDocs
      .map((doc) => mapNewsDoc(doc, preferredLanguage))
      .filter(Boolean)
      .map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        source: item.source,
        publishedAt: item.publishTime,
      }));

    res.json({
      topic: mapTrackingTopic(topic, mappedNews.length),
      items: mappedNews,
      total: mappedNews.length,
    });
  } catch (err) {
    console.error('❌ 获取主题新闻失败:', err);
    res.status(500).json({ error: '获取主题新闻失败' });
  }
});

// 获取定向追踪分析数据
app.get('/api/tracking/analytics', authRequired, async (req, res) => {
  try {
    const topics = await TrackingTopic.find({ userId: req.userId }).lean();
    if (!topics.length) {
      return res.json({
        trendData: [],
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        topSources: [],
      });
    }

    const allKeywords = Array.from(new Set(topics.flatMap((t) => t.keywords || [])));
    const allUrls = Array.from(new Set(topics.flatMap((t) => t.urls || [])));
    const query = buildTopicNewsQuery({ keywords: allKeywords, urls: allUrls });
    if (Object.keys(query).length === 0) {
      return res.json({
        trendData: [],
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        topSources: [],
      });
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 14);
    const scopedQuery = {
      $and: [
        query,
        {
          $or: [
            { postedAt: { $gte: fromDate } },
            { crawledAt: { $gte: fromDate } },
          ],
        },
      ],
    };

    const docs = await News.find(scopedQuery)
      .select('title_zh title_en summary_zh summary_en source_zh source_en postedAt crawledAt')
      .lean();

    const dayCount = new Map();
    const sourceCount = new Map();
    const sentiment = { positive: 0, neutral: 0, negative: 0 };

    const positiveKeywords = ['增长', '利好', '突破', '增长', 'improve', 'growth', 'surge', 'record'];
    const negativeKeywords = ['下跌', '风险', '裁员', '亏损', 'decline', 'drop', 'layoff', 'loss'];

    for (const doc of docs) {
      const dateObj = doc.postedAt || doc.crawledAt;
      if (dateObj) {
        const key = new Date(dateObj).toISOString().split('T')[0];
        dayCount.set(key, (dayCount.get(key) || 0) + 1);
      }

      const source = doc.source_zh || doc.source_en || 'Unknown';
      sourceCount.set(source, (sourceCount.get(source) || 0) + 1);

      const text = `${doc.title_zh || ''} ${doc.title_en || ''} ${doc.summary_zh || ''} ${doc.summary_en || ''}`.toLowerCase();
      const hasPositive = positiveKeywords.some((k) => text.includes(k.toLowerCase()));
      const hasNegative = negativeKeywords.some((k) => text.includes(k.toLowerCase()));
      if (hasPositive && !hasNegative) {
        sentiment.positive += 1;
      } else if (hasNegative && !hasPositive) {
        sentiment.negative += 1;
      } else {
        sentiment.neutral += 1;
      }
    }

    const trendData = Array.from(dayCount.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, count]) => ({ date, count }));

    const topSources = Array.from(sourceCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    res.json({ trendData, sentiment, topSources });
  } catch (err) {
    console.error('❌ 获取追踪分析失败:', err);
    res.status(500).json({ error: '获取追踪分析失败' });
  }
});

// 基于用户关键词的新闻搜索（可匿名；有 token 时按用户偏好和已读/隐藏过滤）
// 注意：需放在 /api/news/:id 之前，避免被误判为 :id
app.get('/api/news/search', async (req, res) => {
  try {
    // 尝试从 token 解析用户（可选）
    const userId = getUserIdFromToken(req);
    let userLanguage = '';
    let userPushSettings = null;
    if (userId) {
      const user = await User.findById(userId).select('pushSettings language').lean();
      userPushSettings = user?.pushSettings || null;
      userLanguage = user?.language || '';
    }

    // 1) 关键词：优先取查询参数；若未提供且有用户，则用用户的 pushSettings.keywords
    let keywords = [];
    const rawKeywords = splitKeywords(req.query.keywords);
    if (rawKeywords.length > 0) {
      keywords = rawKeywords;
    } else if (userPushSettings) {
      if (userPushSettings?.keywords?.length) {
        keywords = userPushSettings.keywords;
      }
    }

    // 2) 条数：优先取查询参数；否则用用户 pushSettings.pushCount；再否则 10
    let limit = Number(req.query.limit) || userPushSettings?.pushCount || 10;
    if (Number.isNaN(limit) || limit <= 0) limit = 10;
    if (limit > 50) limit = 50; // 防止过大

    // 3) 基础查询
    const query = {};
    if (keywords.length) {
      // 使用 OR 匹配标签、标题、摘要（简单 regex）
      const regex = keywords.map((k) => new RegExp(escapeRegex(k), 'i'));
      query.$or = [
        { tags_zh: { $in: keywords } },
        { tags_en: { $in: keywords } },
        { title_zh: { $in: regex } },
        { title_en: { $in: regex } },
        { summary_zh: { $in: regex } },
        { summary_en: { $in: regex } },
      ];
    }

    // 4) 过滤已读/隐藏（仅在用户登录时）
    if (userId) {
      const states = await UserNewsState.find({
        userId,
        status: { $in: ['read', 'hidden'] },
      })
        .select('newsId')
        .lean();
      const excludeIds = states.map((s) => s.newsId);
      if (excludeIds.length) query._id = { $nin: excludeIds };
    }

    const preferredLanguage = getPreferredLanguage(req, userLanguage);

    // 5) 查询
    const items = await News.find(query)
      .sort(RECENT_NEWS_SORT)
      .limit(limit);

    const mappedItems = items.map((item) => mapNewsDoc(item, preferredLanguage)).filter(Boolean);
    res.json({ items: mappedItems, total: mappedItems.length, limit });
  } catch (err) {
    console.error('❌ 搜索失败:', err);
    res.status(500).json({ error: '搜索失败' });
  }
});

// 获取单条新闻详情（在路由内校验 ObjectId，避免与 /api/news/search 冲突）
app.get('/api/news/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid news id' });
    }

    const item = await News.findById(id);
    if (!item) {
      return res.status(404).json({ error: 'News not found' });
    }
    const preferredLanguage = getPreferredLanguage(req);
    res.json(mapNewsDoc(item, preferredLanguage));
  } catch (err) {
    console.error('Error fetching news detail:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 标记新闻状态（已读/隐藏/收藏）
app.post('/api/news/:id/state', authRequired, async (req, res) => {
  try {
    const { status = 'read' } = req.body || {};
    const allowed = ['read', 'hidden', 'bookmarked'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: '非法的状态值' });
    }

    const newsId = req.params.id;
    const updated = await UserNewsState.findOneAndUpdate(
      { userId: req.userId, newsId },
      { status },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ ok: true, data: updated });
  } catch (err) {
    console.error('Error updating news state:', err);
    res.status(500).json({ error: '更新状态失败' });
  }
});

// 新增一条新闻（临时用，后面可以加权限）
app.post('/api/news', async (req, res) => {
  try {
    const body = req.body;
    const identity = buildNewsIdentity({
      link: body.link,
      title: body.title_en || body.title_zh || '',
    });
    
    // 检查是否已存在（规范链接优先，标题哈希兜底）
    const lookupQuery = buildNewsLookupQuery({
      link: body.link,
      canonical_link: identity.canonical_link,
      title_hash: identity.title_hash,
      sourceId: body.sourceId,
    });
    if (Object.keys(lookupQuery).length > 0) {
      const existing = await News.findOne(lookupQuery);
      if (existing) {
        return res.status(409).json({ error: 'News with this link already exists' });
      }
    }
    
    const news = new News({
      // 新格式字段
      title_en: body.title_en,
      title_zh: body.title_zh,
      summary_en: body.summary_en,
      summary_zh: body.summary_zh,
      score: body.score,
      link: body.link,
      canonical_link: identity.canonical_link,
      title_hash: identity.title_hash,
      image_link: body.image_link,
      level1_code: body.level1_code,
      level1_name_zh: body.level1_name_zh,
      level1_name_en: body.level1_name_en,
      level2_codes: body.level2_codes || [],
      level2_names_zh: body.level2_names_zh || [],
      level2_names_en: body.level2_names_en || [],
      tags_en: body.tags_en || [],
      tags_zh: body.tags_zh || [],
      sourceId: body.sourceId,
      source_en: body.source_en,
      source_zh: body.source_zh,
      postedAt: body.postedAt ? new Date(body.postedAt) : null,
      crawledAt: body.crawledAt ? new Date(body.crawledAt) : new Date(),
      language: body.language || 'en'
    });
    
    const saved = await news.save();
    res.status(201).json(mapNewsDoc(saved, getPreferredLanguage(req)));
  } catch (err) {
    console.error('Error creating news:', err);
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
});

// 启动服务器
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`🚀 Backend server is running on port ${port}`);
});
// Legacy monolith entrypoint kept only for rollback and debugging.
// The refactored backend should run through `gateway/app.js` and the services under `services/`.
