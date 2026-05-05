# 认证与访问控制

## 认证链路

```text
Frontend Login/Register
  -> /api/auth/*
  -> User Service
  -> JWT access token / refresh token
  -> Frontend stores auth state
  -> ProtectedRoute protects app pages
  -> Gateway verifies Bearer token for business APIs
```

## 前端保护

受保护页面统一经过 `frontend/src/shared/components/ProtectedRoute.tsx`。未登录用户访问 `/home`、`/news`、`/profile` 和产品页会被重定向到 `/login`。

## 后端保护

Gateway 在以下路由前校验 JWT：

- `/api/news/*`
- `/api/search/*`
- `/api/news/search/*`
- `/api/ai-search/*`
- `/api/agents/*`
- `/api/skills/*`

未携带合法 Bearer token 时返回：

```json
{"error":"Unauthorized"}
```

## Firebase

前端使用 Firebase Auth 作为登录方式之一。后端是否接受未验证 Firebase token 由环境变量控制：

```env
FIREBASE_PROJECT_ID=coregistnews-news
ALLOW_UNVERIFIED_FIREBASE_TOKENS=false
```

生产环境必须保持：

```env
ALLOW_UNVERIFIED_FIREBASE_TOKENS=false
```

## JWT

生产环境必须配置强随机值：

```env
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

不要在文档、提交记录、issue 或聊天中暴露真实 secret。若已经暴露，应轮换密钥并重启所有相关服务。

## 验证命令

未登录请求应返回 401：

```bash
curl -i 'https://coregist-news.com/api/news?page=1&limit=1'
curl -i 'https://coregist-news.com/api/search/public-health'
```

已登录后，浏览器访问 `/home` 和 `/news` 应正常加载页面和新闻数据。
