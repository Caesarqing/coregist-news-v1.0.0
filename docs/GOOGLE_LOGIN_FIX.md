# Google 登录错误修复报告

**修复日期**: 2026-04-28  
**错误信息**: "Cannot read properties of undefined (reading 'user')"

---

## 问题描述

用户在点击 Google/Microsoft/Facebook 登录按钮时，页面显示错误：
```
Cannot read properties of undefined (reading 'user')
```

## 根本原因

在 `frontend/src/pages/auth/Login.tsx` 的 `handleProviderLogin` 函数中，代码尝试访问 `result.user`：

```typescript
// ❌ 错误的代码
const result = await signInWithGoogle();
firebaseUser = result.user;  // result 是 undefined，因为 signInWithGoogle 返回 Promise<void>
```

但是 `FirebaseAuthContext` 中的 `signInWithGoogle` 方法定义为：
```typescript
signInWithGoogle: () => Promise<void>  // 返回 void，不返回 user 对象
```

这导致 `result` 为 `undefined`，访问 `result.user` 时抛出错误。

## 修复方案

### 修改前的代码

```typescript
const handleProviderLogin = async (provider: 'google' | 'microsoft' | 'facebook') => {
  setIsLoading(true);
  setError('');
  
  try {
    console.log(`🔐 尝试 ${provider} 登录`);
    
    let firebaseUser;
    
    // ❌ 错误：尝试从 void 返回值中获取 user
    if (provider === 'google') {
      const result = await signInWithGoogle();
      firebaseUser = result.user;  // TypeError: Cannot read properties of undefined
    }
    
    // 获取Firebase ID Token
    const idToken = await firebaseUser.getIdToken();
    
    // ... 后续代码
  } catch (error: any) {
    // ...
  }
};
```

### 修改后的代码

```typescript
const handleProviderLogin = async (provider: 'google' | 'microsoft' | 'facebook') => {
  setIsLoading(true);
  setError('');
  
  try {
    console.log(`🔐 尝试 ${provider} 登录`);
    
    // ✅ 正确：直接调用登录方法，不尝试获取返回值
    if (provider === 'google') {
      await signInWithGoogle();
    } else if (provider === 'microsoft') {
      await signInWithMicrosoft();
    } else if (provider === 'facebook') {
      await signInWithFacebook();
    }
    
    console.log(`✅ ${provider} Firebase 登录成功，正在获取后端Token...`);
    
    // ✅ 正确：使用 getIdToken 方法从 context 获取 token
    const idToken = await getIdToken();
    
    if (!idToken) {
      throw new Error('登录失败：未获取到Firebase Token');
    }
    
    // 发送到后端换取后端JWT
    const authResult = await authApi.loginWithGoogle(idToken);
    
    // 存储后端JWT
    apiClient.setToken(authResult.access_token || authResult.token);
    if (authResult.refresh_token) {
      apiClient.setRefreshToken(authResult.refresh_token);
    }
    
    console.log(`✅ ${provider} 登录成功，已获取后端Token`);
    
    // 同步语言设置
    try {
      await userSettingsApi.updateLanguage(language);
      console.log('✅ 语言设置已同步');
    } catch (langError) {
      console.warn('⚠️ 同步语言设置失败:', langError);
    }
    
    navigate('/home');
  } catch (error: any) {
    console.error(`❌ ${provider} 登录失败:`, error);
    const providerName = provider === 'google' ? 'Google' : provider === 'microsoft' ? 'Microsoft' : 'Facebook';
    setError(error.message || `${providerName} ${t('googleLoginFailed')}`);
  } finally {
    setIsLoading(false);
  }
};
```

### 关键修改点

1. **移除错误的 `result.user` 访问**：
   - 之前：`const result = await signInWithGoogle(); firebaseUser = result.user;`
   - 现在：`await signInWithGoogle();`

2. **使用 `getIdToken()` 方法**：
   - 之前：`const idToken = await firebaseUser.getIdToken();`
   - 现在：`const idToken = await getIdToken();`

3. **添加 `getIdToken` 到 hook 导入**：
   ```typescript
   const { signInWithGoogle, signInWithMicrosoft, signInWithFacebook, getIdToken } = useFirebaseAuth();
   ```

## 工作流程

修复后的 Google 登录流程：

1. 用户点击 "Google" 按钮
2. 调用 `signInWithGoogle()` → Firebase 弹出登录窗口
3. 用户完成 Google OAuth 授权
4. Firebase 登录成功，`FirebaseAuthContext` 自动更新 `user` 状态
5. 调用 `getIdToken()` 获取 Firebase ID Token
6. 发送 ID Token 到后端 `/api/auth/google`
7. 后端验证 Token，返回后端 JWT (access_token + refresh_token)
8. 前端存储后端 JWT
9. 同步语言设置到后端
10. 导航到 `/home` 页面

## 测试步骤

1. 启动前端：`cd frontend && npm run dev`
2. 启动后端：`cd backend && npm run dev`
3. 访问登录页面：`http://localhost:5173/login`
4. 点击 "Google" 按钮
5. 完成 Google 登录授权
6. 验证：
   - ✅ 不再显示 "Cannot read properties of undefined" 错误
   - ✅ 成功跳转到 `/home` 页面
   - ✅ 浏览器 localStorage 中存储了 `access_token` 和 `refresh_token`
   - ✅ 浏览器控制台显示成功日志

## 前置条件

要测试 Google 登录，需要配置：

1. **Google OAuth Client ID**：
   - 在 [Google Cloud Console](https://console.cloud.google.com/) 创建 OAuth 2.0 客户端
   - 添加授权来源：`http://localhost:5173`

2. **后端环境变量** (`backend/.env`)：
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

3. **Firebase 配置** (`frontend/src/config/firebase.ts`)：
   - 确保 Firebase 项目已启用 Google 登录方式

## 相关文件

- `frontend/src/pages/auth/Login.tsx` - 登录页面组件（已修复）
- `frontend/src/contexts/FirebaseAuthContext.tsx` - Firebase 认证上下文
- `frontend/src/api/apiClient.ts` - API 客户端（包含 token 刷新逻辑）
- `backend/services/user-service/controllers/auth.controller.js` - 后端 Google 登录处理
- `backend/services/shared/node/auth.js` - 后端认证中间件

## 后续优化建议

1. **改进 FirebaseAuthContext 类型定义**：
   - 考虑让 `signInWithGoogle` 返回 `Promise<User>` 而不是 `Promise<void>`
   - 这样可以直接获取用户对象，而不需要额外调用 `getIdToken()`

2. **添加更详细的错误处理**：
   - 区分 Firebase 登录失败和后端 JWT 获取失败
   - 提供更友好的错误提示

3. **添加加载状态指示**：
   - 在 Firebase 登录过程中显示加载动画
   - 在后端 Token 交换过程中显示进度

---

*修复完成于 2026-04-28*
