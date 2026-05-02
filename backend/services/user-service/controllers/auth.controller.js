const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { authRequired, buildAuthResponse, config, issueAuthTokens, verifyFirebaseIdToken, verifyGoogleToken, resolveUserIdFromFirebaseClaims } = require('../../shared/node/auth');
const User = require('../models/User');
const { validateUsername } = require('../validators/username');
const { DEFAULT_PUSH_SETTINGS, buildUserProfileResponse } = require('../services/user-presenters');

async function checkUsername(req, res) {
  try {
    const username = (req.query.username || '').toString().trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ available: false, reason: 'USERNAME_EMPTY' });
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      return res.json({ available: false, reason: validation.reason });
    }

    const existing = await User.findOne({ username }).select('_id').lean();
    if (existing) {
      return res.json({ available: false, reason: 'USERNAME_TAKEN' });
    }

    return res.json({ available: true });
  } catch (error) {
    console.error('❌ 检查用户名失败:', error);
    return res.status(500).json({ available: false, reason: 'USERNAME_VALIDATION_ERROR' });
  }
}

async function register(req, res) {
  try {
    const email = (req.body?.email || '').toString().trim().toLowerCase();
    const password = (req.body?.password || '').toString();
    const username = (req.body?.username || '').toString().trim().toLowerCase();
    const name = (req.body?.name || req.body?.fullName || '').toString().trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'email 和 password 不能为空' });
    }
    if (!username) {
      return res.status(400).json({ error: 'USERNAME_EMPTY' });
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.reason });
    }

    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email }).select('_id').lean(),
      User.findOne({ username }).select('_id').lean(),
    ]);

    if (existingEmail) {
      return res.status(409).json({ error: 'EMAIL_TAKEN' });
    }
    if (existingUsername) {
      return res.status(409).json({ error: 'USERNAME_TAKEN' });
    }

    const user = await User.create({
      email,
      username,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      pushSettings: { ...DEFAULT_PUSH_SETTINGS },
    });

    return res.status(201).json(buildAuthResponse(user, issueAuthTokens(user._id)));
  } catch (error) {
    console.error('❌ 注册失败:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(409).json({ error: field === 'email' ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN' });
    }
    return res.status(500).json({ error: '注册失败', details: error.message });
  }
}

async function login(req, res) {
  try {
    const email = (req.body?.email || req.body?.username || '').toString().trim().toLowerCase();
    const password = (req.body?.password || '').toString();

    if (!email || !password) {
      return res.status(400).json({ error: 'email 和 password 不能为空' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    if (!user.passwordHash) {
      return res.status(401).json({ error: '该账户使用第三方登录，请使用Google登录' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    return res.json(buildAuthResponse(user, issueAuthTokens(user._id)));
  } catch (error) {
    console.error('❌ 登录失败:', error);
    return res.status(500).json({ error: '登录失败', details: error.message });
  }
}

async function refresh(req, res) {
  try {
    const refreshToken = (req.body?.refresh_token || '').toString().trim();
    if (!refreshToken) {
      return res.status(400).json({ error: 'refresh_token 不能为空' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch {
      return res.status(401).json({ error: 'refresh_token 无效或已过期' });
    }

    if (decoded?.tokenType && decoded.tokenType !== 'refresh') {
      return res.status(401).json({ error: 'refresh_token 类型错误' });
    }

    const user = await User.findById(decoded.userId).select('email username name avatar_url');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    return res.json(buildAuthResponse(user, issueAuthTokens(user._id)));
  } catch (error) {
    console.error('❌ 刷新 token 失败:', error);
    return res.status(500).json({ error: '刷新 token 失败' });
  }
}

async function sendResetCode(req, res) {
  try {
    const method = (req.body?.method || 'email').toString();
    const email = (req.body?.email || '').toString().trim().toLowerCase();

    if (method !== 'email') {
      return res.status(400).json({ error: '仅支持邮箱重置' });
    }
    if (!email) {
      return res.status(400).json({ error: 'email 不能为空' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const user = await User.findOne({ email });
    if (user) {
      user.resetPasswordCodeHash = await bcrypt.hash(code, 10);
      user.resetPasswordCodeExpiresAt = new Date(Date.now() + config.resetCodeExpiresMinutes * 60 * 1000);
      await user.save();
      console.log(`📨 重置密码验证码（开发环境） email=${email} code=${code}`);
    }

    return res.json({ message: '验证码已发送（如邮箱存在）' });
  } catch (error) {
    console.error('❌ 发送验证码失败:', error);
    return res.status(500).json({ error: '发送验证码失败' });
  }
}

async function resetPassword(req, res) {
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

    const valid = await bcrypt.compare(code, user.resetPasswordCodeHash);
    if (!valid) {
      return res.status(400).json({ error: '验证码错误' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordCodeHash = null;
    user.resetPasswordCodeExpiresAt = null;
    await user.save();

    return res.json({ message: '密码重置成功' });
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
    return res.status(500).json({ error: '重置密码失败' });
  }
}

async function googleLogin(req, res) {
  try {
    const googleToken = (req.body?.token || '').toString().trim();
    console.log('📥 收到 Google 登录请求，Token 长度:', googleToken.length);
    
    if (!googleToken) {
      return res.status(400).json({ error: '缺少Google token' });
    }

    // 尝试验证 Firebase ID Token
    console.log('🔍 尝试验证 Firebase ID Token...');
    const firebaseClaims = await verifyFirebaseIdToken(googleToken);
    
    if (firebaseClaims) {
      console.log('✅ Firebase Token 验证成功，Claims:', { email: firebaseClaims.email, sub: firebaseClaims.sub });
      
      // 使用 Firebase Token 登录
      const userId = await resolveUserIdFromFirebaseClaims(firebaseClaims);
      console.log('👤 解析用户 ID:', userId);
      
      if (!userId) {
        console.error('❌ 无法从 Firebase Claims 解析用户 ID');
        return res.status(400).json({ error: 'Firebase Token 验证失败' });
      }
      
      const user = await User.findById(userId).select('email username name avatar_url');
      if (!user) {
        console.error('❌ 用户不存在:', userId);
        return res.status(404).json({ error: '用户不存在' });
      }
      
      console.log('✅ 用户登录成功:', user.email);
      return res.json(buildAuthResponse(user, issueAuthTokens(user._id)));
    }

    // 如果不是 Firebase Token，尝试 Google OAuth Token
    console.log('🔍 Firebase Token 验证失败，尝试 Google OAuth Token...');
    const payload = await verifyGoogleToken(googleToken);
    const email = (payload.email || '').toString().trim().toLowerCase();
    const googleId = (payload.sub || '').toString().trim();
    const name = (payload.name || '').toString().trim();
    const picture = (payload.picture || '').toString().trim();

    if (!email) {
      return res.status(400).json({ error: 'Google账户缺少邮箱信息' });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture) user.avatar_url = picture;
        await user.save();
      }
    } else {
      let username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      const baseUsername = username;
      let counter = 1;
      while (await User.findOne({ username }).select('_id').lean()) {
        username = `${baseUsername}${counter}`;
        counter += 1;
      }

      user = await User.create({
        email,
        username,
        name,
        googleId,
        avatar_url: picture || '',
        passwordHash: undefined,
        pushSettings: { ...DEFAULT_PUSH_SETTINGS },
      });
    }

    console.log('✅ Google OAuth 登录成功:', user.email);
    return res.json(buildAuthResponse(user, issueAuthTokens(user._id)));
  } catch (error) {
    console.error('❌ Google 登录失败:', error);
    console.error('错误堆栈:', error.stack);
    return res.status(500).json({ error: 'Google登录失败', details: error.message });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.userId).select('email username name bio phone birthday avatar_url pushSettings language createdAt updatedAt');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    return res.json(buildUserProfileResponse(user));
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error);
    return res.status(500).json({ error: '获取用户信息失败' });
  }
}

async function changePassword(req, res) {
  try {
    const currentPassword = (req.body?.current_password || '').toString();
    const newPassword = (req.body?.new_password || '').toString();

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'current_password 和 new_password 不能为空' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    if (!user.passwordHash) {
      return res.status(400).json({ error: '当前账户未设置密码，请使用忘记密码流程设置密码' });
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: '当前密码不正确' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('❌ 修改密码失败:', error);
    return res.status(500).json({ error: '修改密码失败' });
  }
}

module.exports = {
  authRequired,
  changePassword,
  checkUsername,
  googleLogin,
  login,
  me,
  refresh,
  register,
  resetPassword,
  sendResetCode,
};
