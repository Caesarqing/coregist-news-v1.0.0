# Firebase 认证集成指南

## 概述

已成功集成 Firebase Authentication，支持以下功能：
- ✅ Google 邮箱登录
- ✅ 邮箱密码注册
- ✅ 邮箱密码登录
- ✅ 密码重置（通过邮件）
- ✅ 邮箱验证
- ✅ 认证状态管理

## Firebase 配置信息

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBLKXeUC3nXf5Ra106fILv44n73BS-HzRY",
  authDomain: "coregistnews-news.firebaseapp.com",
  projectId: "coregistnews-news",
  storageBucket: "coregistnews-news.firebasestorage.app",
  messagingSenderId: "44442095523",
  appId: "1:44442095523:web:55802ff49dae261635d416",
  measurementId: "G-EZJ8E4HN4L"
};
```

## 已创建的文件

### 1. Firebase 配置文件
**文件**: `src/config/firebase.ts`

包含：
- Firebase 初始化
- 认证服务封装
- Google 登录配置
- 错误消息映射

### 2. Firebase 认证上下文
**文件**: `src/contexts/FirebaseAuthContext.tsx`

提供：
- 全局认证状态管理
- 用户信息
- 认证方法
- Token 管理

### 3. 更新的页面

#### 登录页面 (`src/pages/auth/Login.tsx`)
- ✅ 添加 Firebase Google 登录
- ✅ 保留原有邮箱密码登录
- ✅ 自动同步 Token

#### 忘记密码页面 (`src/pages/auth/ForgotPassword.tsx`)
- ✅ 添加 Firebase 密码重置（推荐）
- ✅ 保留原有验证码方式
- ✅ 双重选择，用户体验更好

## 使用方法

### 1. 在 App.tsx 中添加 Provider

```tsx
import { FirebaseAuthProvider } from '~/contexts/FirebaseAuthContext';

function App() {
  return (
    <FirebaseAuthProvider>
      {/* 你的应用内容 */}
    </FirebaseAuthProvider>
  );
}
```

### 2. 在组件中使用 Firebase 认证

```tsx
import { useFirebaseAuth } from '~/contexts/FirebaseAuthContext';

function MyComponent() {
  const { user, signInWithGoogle, signOut } = useFirebaseAuth();

  return (
    <div>
      {user ? (
        <div>
          <p>欢迎, {user.displayName || user.email}</p>
          <button onClick={signOut}>登出</button>
        </div>
      ) : (
        <button onClick={signInWithGoogle}>Google 登录</button>
      )}
    </div>
  );
}
```

### 3. 可用的认证方法

```typescript
// Google 登录
await signInWithGoogle();

// 邮箱密码登录
await signInWithEmail(email, password);

// 邮箱密码注册
await registerWithEmail(email, password, displayName);

// 发送密码重置邮件
await sendPasswordReset(email);

// 登出
await signOut();

// 获取 ID Token
const token = await getIdToken();
```

## Firebase 控制台配置

### 1. 启用认证方式

在 Firebase 控制台 > Authentication > Sign-in method 中启用：

1. **Email/Password**
   - 启用 Email/Password
   - 启用 Email link (passwordless sign-in) - 可选

2. **Google**
   - 启用 Google 登录
   - 配置项目公开名称
   - 配置支持邮箱

### 2. 配置授权域名

在 Firebase 控制台 > Authentication > Settings > Authorized domains 中添加：

```
localhost
coregist-news.com
www.coregist-news.com
your-vercel-domain.vercel.app
```

### 3. 配置邮件模板

在 Firebase 控制台 > Authentication > Templates 中自定义：

- 密码重置邮件
- 邮箱验证邮件
- 邮箱地址变更邮件

**建议配置：**
- 使用自定义域名（如 noreply@coregist-news.com）
- 自定义邮件模板样式
- 添加公司 Logo

### 4. 配置密码策略

在 Firebase 控制台 > Authentication > Settings > Password policy：

- 最小长度：8 字符
- 要求大小写字母
- 要求数字
- 要求特殊字符（可选）

## 安全规则

### Firestore 安全规则示例

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用户只能读写自己的数据
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 公开数据
    match /news/{newsId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Storage 安全规则示例

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 用户头像
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 错误处理

### 常见错误代码

| 错误代码 | 中文消息 | 英文消息 |
|---------|---------|---------|
| `auth/email-already-in-use` | 该邮箱已被注册 | Email already in use |
| `auth/invalid-email` | 邮箱格式不正确 | Invalid email |
| `auth/weak-password` | 密码强度太弱 | Weak password |
| `auth/user-not-found` | 用户不存在 | User not found |
| `auth/wrong-password` | 密码错误 | Wrong password |
| `auth/too-many-requests` | 请求过于频繁 | Too many requests |
| `auth/popup-closed-by-user` | 登录窗口被关闭 | Popup closed |

### 错误处理示例

```typescript
try {
  await firebaseAuth.signInWithGoogle();
} catch (error: any) {
  // 错误已经被转换为用户友好的消息
  console.error(error.message);
  // 显示错误给用户
  setError(error.message);
}
```

## Token 管理

### Token 存储

Firebase ID Token 会自动存储到：
- `localStorage.setItem('firebase_token', token)`
- `localStorage.setItem('access_token', token)` - 兼容现有系统

### Token 刷新

Firebase SDK 会自动刷新 Token，无需手动处理。

### 在 API 请求中使用 Token

```typescript
const token = await firebaseAuth.getIdToken();

fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 与现有系统集成

### 1. 双重认证支持

系统现在支持两种认证方式：
- Firebase 认证（Google 登录、Firebase 邮箱密码）
- 原有后端认证（邮箱密码、验证码）

### 2. Token 兼容性

Firebase Token 存储为 `access_token`，与现有系统兼容。

### 3. 用户数据同步

建议在后端创建 Firebase 用户同步逻辑：

```typescript
// 后端示例（Node.js）
import admin from 'firebase-admin';

// 验证 Firebase Token
async function verifyFirebaseToken(token: string) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    
    // 在数据库中查找或创建用户
    let user = await db.users.findOne({ firebaseUid: uid });
    if (!user) {
      user = await db.users.create({
        firebaseUid: uid,
        email: email,
        // 其他用户信息
      });
    }
    
    return user;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

## 测试

### 1. 本地测试

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
# 测试 Google 登录
# 测试邮箱密码登录
# 测试密码重置
```

### 2. 测试账号

建议创建测试账号：
- test@coregist-news.com
- 密码：Test123456

### 3. 测试清单

- [ ] Google 登录成功
- [ ] Google 登录失败处理
- [ ] 邮箱密码登录成功
- [ ] 邮箱密码登录失败处理
- [ ] 密码重置邮件发送
- [ ] 密码重置成功
- [ ] Token 自动刷新
- [ ] 登出功能
- [ ] 多设备登录
- [ ] 认证状态持久化

## 性能优化

### 1. 懒加载 Firebase

```typescript
// 只在需要时加载 Firebase
const loadFirebase = async () => {
  const { firebaseAuth } = await import('~/config/firebase');
  return firebaseAuth;
};
```

### 2. Token 缓存

Firebase SDK 已经实现了 Token 缓存，无需额外处理。

### 3. 减少 Bundle 大小

```typescript
// 只导入需要的功能
import { getAuth, signInWithPopup } from 'firebase/auth';
// 而不是
import * as firebase from 'firebase';
```

## 监控和分析

### 1. Firebase Analytics

已集成 Firebase Analytics，自动追踪：
- 用户登录事件
- 用户注册事件
- 错误事件

### 2. 自定义事件

```typescript
import { analytics } from '~/config/firebase';
import { logEvent } from 'firebase/analytics';

// 记录自定义事件
if (analytics) {
  logEvent(analytics, 'custom_event', {
    event_category: 'engagement',
    event_label: 'button_click'
  });
}
```

## 故障排除

### 问题 1：Google 登录弹窗被阻止

**解决方案：**
- 确保浏览器允许弹窗
- 使用 HTTPS（本地开发使用 localhost）
- 检查浏览器控制台错误

### 问题 2：密码重置邮件未收到

**解决方案：**
- 检查垃圾邮件文件夹
- 确认邮箱地址正确
- 检查 Firebase 控制台的邮件发送日志
- 验证邮件模板配置

### 问题 3：Token 过期

**解决方案：**
- Firebase SDK 会自动刷新 Token
- 如果仍然过期，调用 `getIdToken(true)` 强制刷新

### 问题 4：跨域问题

**解决方案：**
- 在 Firebase 控制台添加授权域名
- 确保 CORS 配置正确

## 最佳实践

### 1. 安全性

- ✅ 永远不要在前端存储敏感信息
- ✅ 使用 HTTPS
- ✅ 定期更新 Firebase SDK
- ✅ 启用多因素认证（MFA）
- ✅ 监控异常登录活动

### 2. 用户体验

- ✅ 提供清晰的错误消息
- ✅ 显示加载状态
- ✅ 支持记住登录状态
- ✅ 提供多种登录方式
- ✅ 简化注册流程

### 3. 性能

- ✅ 懒加载 Firebase
- ✅ 缓存用户信息
- ✅ 减少不必要的 API 调用
- ✅ 使用 CDN 加速

## 下一步

### 短期任务

- [ ] 在 App.tsx 中添加 FirebaseAuthProvider
- [ ] 测试所有认证流程
- [ ] 配置 Firebase 邮件模板
- [ ] 添加授权域名

### 中期任务

- [ ] 实现后端 Token 验证
- [ ] 同步用户数据到数据库
- [ ] 添加用户资料管理
- [ ] 实现多因素认证

### 长期任务

- [ ] 添加社交登录（Facebook, Twitter）
- [ ] 实现单点登录（SSO）
- [ ] 添加生物识别认证
- [ ] 实现无密码登录

## 参考资源

- [Firebase Authentication 文档](https://firebase.google.com/docs/auth)
- [Firebase Web SDK 参考](https://firebase.google.com/docs/reference/js/auth)
- [Firebase 安全规则](https://firebase.google.com/docs/rules)
- [Firebase 最佳实践](https://firebase.google.com/docs/auth/web/best-practices)

## 支持

如果遇到问题：
1. 查看 Firebase 控制台日志
2. 检查浏览器控制台错误
3. 参考本文档的故障排除部分
4. 查看 Firebase 官方文档
