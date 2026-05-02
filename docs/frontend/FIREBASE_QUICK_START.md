# Firebase 快速开始指南

## ✅ 已完成的工作

1. ✅ 安装 Firebase SDK
2. ✅ 创建 Firebase 配置文件
3. ✅ 创建认证上下文
4. ✅ 更新登录页面（添加 Google 登录）
5. ✅ 更新忘记密码页面（添加 Firebase 密码重置）
6. ✅ 所有代码通过语法检查

## 🚀 立即使用（3步）

### 步骤 1：在 App.tsx 中添加 Provider

打开 `App.tsx`，添加 FirebaseAuthProvider：

```tsx
import { FirebaseAuthProvider } from '~/contexts/FirebaseAuthContext';

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseAuthProvider>  {/* 添加这一行 */}
        <BrowserRouter>
          <Routes>
            {/* 你的路由 */}
          </Routes>
        </BrowserRouter>
      </FirebaseAuthProvider>  {/* 添加这一行 */}
    </ErrorBoundary>
  );
}
```

### 步骤 2：配置 Firebase 控制台

1. 访问 [Firebase 控制台](https://console.firebase.google.com/)
2. 选择项目：`coregistnews-news`
3. 进入 **Authentication** > **Sign-in method**
4. 启用以下登录方式：
   - ✅ Email/Password
   - ✅ Google

5. 在 **Settings** > **Authorized domains** 中添加：
   ```
   localhost
   coregist-news.com
   www.coregist-news.com
   ```

### 步骤 3：测试功能

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173/login
# 点击 Google 按钮测试登录
```

## 📋 功能清单

### 登录页面 (`/login`)

- ✅ 邮箱密码登录（原有）
- ✅ Google 登录（新增）
- ✅ 自动 Token 管理
- ✅ 错误处理
- ✅ 加载状态

### 忘记密码页面 (`/forgot-password`)

- ✅ Firebase 密码重置（推荐）
  - 发送重置邮件到用户邮箱
  - 用户点击邮件链接重置密码
  - 更安全、更简单

- ✅ 验证码方式（原有）
  - 发送验证码到邮箱
  - 输入验证码和新密码
  - 立即重置

### 注册页面 (`/register`)

当前使用原有注册方式，可以选择性添加 Firebase 注册。

## 🎯 使用示例

### 在任何组件中使用 Firebase 认证

```tsx
import { useFirebaseAuth } from '~/contexts/FirebaseAuthContext';

function MyComponent() {
  const { 
    user,              // 当前用户
    loading,           // 加载状态
    signInWithGoogle,  // Google 登录
    signOut            // 登出
  } = useFirebaseAuth();

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      {user ? (
        <div>
          <p>欢迎, {user.displayName || user.email}</p>
          <img src={user.photoURL} alt="头像" />
          <button onClick={signOut}>登出</button>
        </div>
      ) : (
        <button onClick={signInWithGoogle}>
          Google 登录
        </button>
      )}
    </div>
  );
}
```

### 获取用户 Token

```tsx
const { getIdToken } = useFirebaseAuth();

// 在 API 请求中使用
const token = await getIdToken();
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 🔧 配置选项

### 自定义 Google 登录按钮

登录页面已经包含了 Google 登录按钮，样式与其他登录方式一致。

### 自定义错误消息

错误消息已经在 `src/config/firebase.ts` 中配置，支持中英文。

### 自定义邮件模板

在 Firebase 控制台 > Authentication > Templates 中自定义：
- 密码重置邮件
- 邮箱验证邮件
- 邮箱地址变更邮件

## 📊 用户流程

### Google 登录流程

```
用户点击 "Google" 按钮
    ↓
弹出 Google 登录窗口
    ↓
用户选择 Google 账号
    ↓
Firebase 验证并返回用户信息
    ↓
Token 存储到 localStorage
    ↓
跳转到 /home
```

### 密码重置流程（Firebase）

```
用户输入邮箱
    ↓
点击 "发送重置邮件"
    ↓
Firebase 发送邮件
    ↓
用户收到邮件
    ↓
点击邮件中的链接
    ↓
在 Firebase 页面重置密码
    ↓
返回登录页面
```

### 密码重置流程（验证码）

```
用户输入邮箱
    ↓
点击 "发送验证码"
    ↓
后端发送验证码
    ↓
用户输入验证码和新密码
    ↓
点击 "重置密码"
    ↓
密码更新成功
    ↓
跳转到登录页面
```

## 🔐 安全建议

1. **启用邮箱验证**
   ```tsx
   // 注册后自动发送验证邮件
   await firebaseAuth.registerWithEmail(email, password, name);
   // 验证邮件已自动发送
   ```

2. **检查邮箱验证状态**
   ```tsx
   const { user } = useFirebaseAuth();
   if (user && !user.emailVerified) {
     // 提示用户验证邮箱
   }
   ```

3. **强制重新认证**
   ```tsx
   // 敏感操作前要求重新登录
   if (needsRecentLogin) {
     await signOut();
     // 提示用户重新登录
   }
   ```

## 🐛 常见问题

### Q: Google 登录弹窗被阻止？
A: 确保浏览器允许弹窗，或使用 HTTPS。

### Q: 密码重置邮件未收到？
A: 检查垃圾邮件文件夹，或在 Firebase 控制台查看发送日志。

### Q: Token 过期怎么办？
A: Firebase SDK 会自动刷新 Token，无需手动处理。

### Q: 如何自定义邮件模板？
A: 在 Firebase 控制台 > Authentication > Templates 中编辑。

### Q: 支持其他登录方式吗？
A: 可以，Firebase 支持 Facebook、Twitter、GitHub 等，需要额外配置。

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `src/config/firebase.ts` | Firebase 配置和认证服务 |
| `src/contexts/FirebaseAuthContext.tsx` | 认证上下文 |
| `src/pages/auth/Login.tsx` | 登录页面 |
| `src/pages/auth/ForgotPassword.tsx` | 忘记密码页面 |
| `FIREBASE_INTEGRATION_GUIDE.md` | 完整集成指南 |

## 🎉 完成！

现在你的应用已经集成了 Firebase 认证功能：
- ✅ Google 登录
- ✅ 邮箱密码登录
- ✅ 密码重置
- ✅ Token 管理
- ✅ 错误处理

只需在 App.tsx 中添加 Provider，然后在 Firebase 控制台启用认证方式即可使用！
