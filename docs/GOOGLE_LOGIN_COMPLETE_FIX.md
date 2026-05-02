# Google 登录完整修复指南

## 问题诊断

### 当前状态
1. ✅ 前端代码已修复 - Firebase ID Token 获取正确
2. ✅ 后端代码已修复 - 支持 Firebase ID Token 验证
3. ❌ **MongoDB 未运行** - 这是主要问题
4. ❌ **所有微服务未运行** - 因为 MongoDB 未启动

### 错误原因
- 502 Bad Gateway 错误是因为 Gateway 无法连接到 User Service (端口 3001)
- User Service 无法启动是因为 MongoDB 未运行
- MongoDB 连接失败导致所有服务启动失败

## 解决方案

### 步骤 1: 启动 MongoDB

```bash
# 方法 1: 使用 Homebrew (推荐)
brew services start mongodb-community

# 方法 2: 直接启动
mongod --config /opt/homebrew/etc/mongod.conf

# 方法 3: 使用 Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 步骤 2: 验证 MongoDB 连接

```bash
cd backend
node scripts/test-mongodb-connection.js
```

预期输出应该显示：
```
✅ MongoDB 连接成功
✅ User 模型查询成功
```

### 步骤 3: 启动所有微服务

```bash
cd backend
chmod +x start-all.sh
./start-all.sh
```

或者手动启动每个服务（用于调试）：

```bash
# 终端 1: Gateway
cd backend
node gateway/app.js

# 终端 2: User Service
cd backend
node services/user-service/app.js

# 终端 3: News Service
cd backend
node services/news-service/app.js

# 终端 4: Search Service
cd backend
node services/search-service/app.js
```

### 步骤 4: 验证服务状态

```bash
# 检查所有服务是否运行
lsof -i :3000  # Gateway
lsof -i :3001  # User Service
lsof -i :3002  # News Service
lsof -i :3005  # Search Service

# 或者使用健康检查端点
curl http://localhost:3000/api/health
```

预期输出：
```json
{
  "status": "ok",
  "services": [
    {"name": "user-service", "ok": true, "status": 200},
    {"name": "news-service", "ok": true, "status": 200},
    {"name": "search-service", "ok": true, "status": 200}
  ]
}
```

### 步骤 5: 测试 Google 登录

1. 打开前端: http://localhost:5173
2. 点击 "使用 Google 登录"
3. 选择 Google 账户
4. 应该成功登录并跳转到主页

## 技术细节

### Firebase 配置
系统使用 Firebase Authentication，配置在：
- **Project ID**: `coregistnews-news` (在 `backend/services/shared/node/config.js`)
- **Frontend**: Firebase SDK 配置在 `frontend/src/firebase.ts`

### Token 验证流程
1. 前端使用 Firebase SDK 获取 ID Token
2. 前端发送 Token 到 `/api/auth/google-login`
3. Gateway 转发到 User Service (端口 3001)
4. User Service 验证 Firebase ID Token:
   - 从 Google 获取公钥
   - 验证 Token 签名
   - 检查 audience 和 issuer
5. 创建或更新用户
6. 返回 JWT access_token 和 refresh_token

### 代码修改记录

#### 前端修改 (`frontend/src/pages/auth/Login.tsx`)
```typescript
// 修复前: 尝试访问不存在的 result.user
const result = await signInWithPopup(auth, provider);
const token = await result.user.getIdToken(); // ❌ 错误

// 修复后: 使用 getIdToken() 方法
const result = await signInWithPopup(auth, provider);
const user = auth.currentUser;
const token = await user.getIdToken(); // ✅ 正确
```

#### 后端修改 (`backend/services/user-service/controllers/auth.controller.js`)
```javascript
// 添加 Firebase Token 验证逻辑
const firebaseClaims = await verifyFirebaseIdToken(googleToken);
if (firebaseClaims) {
  const userId = await resolveUserIdFromFirebaseClaims(firebaseClaims);
  // ... 返回用户信息和 JWT
}
```

## 常见问题

### Q1: MongoDB 连接失败
**错误**: `MongoServerError: connect ECONNREFUSED 127.0.0.1:27017`

**解决**:
```bash
# 检查 MongoDB 是否运行
brew services list | grep mongodb

# 启动 MongoDB
brew services start mongodb-community
```

### Q2: User Service 启动失败
**错误**: `❌ User service 启动失败: MongooseError`

**解决**: 确保 MongoDB 先启动，然后再启动 User Service

### Q3: 502 Bad Gateway
**错误**: Gateway 返回 502 错误

**解决**: 
1. 检查 User Service 是否运行: `lsof -i :3001`
2. 检查 Gateway 日志是否有连接错误
3. 确认 `.env` 文件中 `USER_SERVICE_PORT=3001` 配置正确

### Q4: Firebase Token 验证失败
**错误**: `Firebase Token 验证失败`

**解决**:
1. 确认 `FIREBASE_PROJECT_ID` 在 `.env` 中配置正确
2. 检查前端 Firebase 配置是否匹配
3. 确认网络可以访问 Google 的公钥服务器

## 验证清单

- [ ] MongoDB 正在运行 (端口 27017)
- [ ] Gateway 正在运行 (端口 3000)
- [ ] User Service 正在运行 (端口 3001)
- [ ] News Service 正在运行 (端口 3002)
- [ ] Search Service 正在运行 (端口 3005)
- [ ] 健康检查端点返回 "ok"
- [ ] 前端可以访问 (http://localhost:5173)
- [ ] Google 登录按钮可点击
- [ ] 登录成功后跳转到主页
- [ ] 用户信息正确显示

## 下一步

完成上述步骤后，Google 登录应该可以正常工作。如果仍有问题：

1. 查看浏览器控制台错误
2. 查看 User Service 日志输出
3. 使用 `curl` 测试 API 端点
4. 检查 MongoDB 中是否创建了用户记录

## 相关文档

- [Firebase Authentication 文档](https://firebase.google.com/docs/auth)
- [Google Identity 文档](https://developers.google.com/identity)
- `docs/GOOGLE_LOGIN_FIX.md` - 前端修复详情
- `docs/FIREBASE_TOKEN_FIX.md` - 后端修复详情
