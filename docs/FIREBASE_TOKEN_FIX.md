# Firebase Token 验证修复报告

**修复日期**: 2026-04-28  
**问题**: Google 登录返回 500 Internal Server Error

---

## 问题描述

用户点击 Google 登录按钮后：
1. ✅ Firebase Google 登录成功
2. ✅ 获取到 Firebase ID Token
3. ❌ 发送到后端 `/api/auth/google` 时返回 500 错误
4. ❌ 显示 "Google登录失败"

## 根本原因

**Token 类型不匹配**：

- **前端发送的是**: Firebase ID Token（由 Firebase Authentication 签发）
- **后端期望的是**: Google OAuth2 Token（由 Google OAuth2 API 签发）

这两种 Token 的格式和验证方式完全不同：

### Firebase ID Token
```
格式: JWT (JSON Web Token)
签发者: Firebase Authentication
验证方式: 使用 Firebase 公钥验证签名
包含信息: email, name, picture, sub (user ID), aud (project ID)
```

### Google OAuth2 Token  
```
格式: OAuth2 Access Token
签发者: Google OAuth2 API
验证方式: 使用 Google OAuth2Client 验证
需要配置: GOOGLE_CLIENT_ID 环境变量
```

## 错误流程

```
前端 Firebase 登录
  ↓
获取 Firebase ID Token
  ↓
POST /api/auth/google { token: "Firebase ID Token" }
  ↓
后端 googleLogin() 函数
  ↓
调用 verifyGoogleToken(firebaseToken)  ← ❌ 类型不匹配
  ↓
检查 googleClient 是否存在
  ↓
如果 GOOGLE_CLIENT_ID 未配置 → googleClient = null
  ↓
抛出错误: "Google登录功能未配置"
  ↓
返回 500 Internal Server Error
```

## 修复方案

修改后端 `googleLogin` 函数，支持两种 Token 类型：

1. **优先尝试 Firebase ID Token 验证**（不需要 GOOGLE_CLIENT_ID）
2. **如果失败，再尝试 Google OAuth2 Token 验证**（需要 GOOGLE_CLIENT_ID）

### 修改的文件

#### 1. `backend/services/shared/node/auth.js`

添加导出：
```javascript
module.exports = {
  authRequired,
  buildAuthResponse,
  config,
  extractBearerToken,
  issueAuthTokens,
  optionalAuth,
  resolveUserIdFromFirebaseClaims,  // ← 新增
  verifyBackendAccessToken,
  verifyFirebaseIdToken,             // ← 新增
  verifyGoogleToken,
};
```

#### 2. `backend/services/user-service/controllers/auth.controller.js`

**修改前**：
```javascript
async function googleLogin(req, res) {
  try {
    const googleToken = (req.body?.token || '').toString().trim();
    if (!googleToken) {
      return res.status(400).json({ error: '缺少Google token' });
    }

    // ❌ 直接使用 Google OAuth2 验证
    const payload = await verifyGoogleToken(googleToken);
    // ... 后续处理
  } catch (error) {
    return res.status(500).json({ error: 'Google登录失败' });
  }
}
```

**修改后**：
```javascript
async function googleLogin(req, res) {
  try {
    const googleToken = (req.body?.token || '').toString().trim();
    if (!googleToken) {
      return res.status(400).json({ error: '缺少Google token' });
    }

    // ✅ 优先尝试 Firebase ID Token 验证
    const firebaseClaims = await verifyFirebaseIdToken(googleToken);
    
    if (firebaseClaims) {
      // 使用 Firebase Token 登录
      const userId = await resolveUserIdFromFirebaseClaims(firebaseClaims);
      if (!userId) {
        return res.status(400).json({ error: 'Firebase Token 验证失败' });
      }
      
      const user = await User.findById(userId).select('email username name avatar_url');
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }
      
      return res.json(buildAuthResponse(user, issueAuthTokens(user._id)));
    }

    // ✅ 如果不是 Firebase Token，尝试 Google OAuth Token
    const payload = await verifyGoogleToken(googleToken);
    // ... 后续处理（创建或查找用户）
  } catch (error) {
    return res.status(500).json({ error: 'Google登录失败', details: error.message });
  }
}
```

## 修复后的流程

```
前端 Firebase 登录
  ↓
获取 Firebase ID Token
  ↓
POST /api/auth/google { token: "Firebase ID Token" }
  ↓
后端 googleLogin() 函数
  ↓
调用 verifyFirebaseIdToken(firebaseToken)  ← ✅ 正确的验证方式
  ↓
验证成功，获取 Firebase Claims (email, name, picture)
  ↓
调用 resolveUserIdFromFirebaseClaims(claims)
  ↓
查找或创建用户
  ↓
返回后端 JWT (access_token + refresh_token)
  ↓
前端存储 JWT
  ↓
✅ 登录成功，跳转到首页
```

## 优势

### 1. 不需要配置 GOOGLE_CLIENT_ID

使用 Firebase Token 验证时，只需要配置：
```env
FIREBASE_PROJECT_ID=coregistnews-news
```

不需要：
```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com  # 可选
```

### 2. 支持多种登录方式

- ✅ Firebase Google 登录（不需要 GOOGLE_CLIENT_ID）
- ✅ Firebase Microsoft 登录
- ✅ Firebase Facebook 登录
- ✅ Google OAuth2 登录（需要 GOOGLE_CLIENT_ID）

### 3. 统一的用户管理

所有通过 Firebase 登录的用户都会：
1. 自动创建账户（如果不存在）
2. 生成唯一的 username
3. 存储用户信息（email, name, avatar_url）
4. 返回后端 JWT，支持 Token 刷新

## 测试步骤

1. **启动后端**：
   ```bash
   cd backend && npm run dev
   ```

2. **启动前端**：
   ```bash
   cd frontend && npm run dev
   ```

3. **测试 Google 登录**：
   - 访问 `http://localhost:5173/login`
   - 点击 "Google" 按钮
   - 完成 Google 授权
   - 验证：
     - ✅ 不再显示 500 错误
     - ✅ 成功跳转到首页
     - ✅ localStorage 中存储了 access_token 和 refresh_token
     - ✅ 可以正常使用推送设置等功能

4. **查看后端日志**：
   ```bash
   tail -f backend/.runtime/logs/user-service.log
   ```
   
   应该看到：
   ```
   ✅ Firebase Token 验证成功
   ✅ 用户已创建/登录
   ```

## 环境变量配置

### 必需配置

```env
# backend/.env
FIREBASE_PROJECT_ID=coregistnews-news
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
MONGODB_URI=mongodb://127.0.0.1:27017/coregistnews
```

### 可选配置

```env
# 如果需要支持 Google OAuth2 登录（非 Firebase）
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## 相关文件

- ✅ `backend/services/user-service/controllers/auth.controller.js` - Google 登录处理（已修复）
- ✅ `backend/services/shared/node/auth.js` - 认证工具函数（已添加导出）
- ✅ `frontend/src/pages/auth/Login.tsx` - 登录页面（已修复 undefined 错误）
- ✅ `frontend/src/config/firebase.ts` - Firebase 配置
- ✅ `frontend/src/contexts/FirebaseAuthContext.tsx` - Firebase 认证上下文

## 后续优化建议

1. **添加更详细的日志**：
   - 记录 Token 类型（Firebase vs Google OAuth2）
   - 记录用户创建/登录事件

2. **改进错误处理**：
   - 区分不同类型的验证失败
   - 提供更友好的错误提示

3. **添加 Token 缓存**：
   - 缓存 Firebase 公钥，减少网络请求
   - 当前已实现，但可以添加更多监控

---

*修复完成于 2026-04-28*
