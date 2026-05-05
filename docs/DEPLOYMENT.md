# 部署指南

## 生产环境基础配置

生产 `.env` 至少包含：

```env
NODE_ENV=production
PORT=3000

MONGODB_URI=mongodb://user:password@127.0.0.1:27017/coregistnews?authSource=coregistnews
MONGODB_DB_NAME=coregistnews
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672/

JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me

FIREBASE_PROJECT_ID=coregistnews-news
ALLOW_UNVERIFIED_FIREBASE_TOKENS=false

GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
NEWS_SERVICE_PORT=3002
AGENT_CONFIG_PORT=3003
SKILL_CONFIG_PORT=3004
SEARCH_SERVICE_PORT=3005

USER_SERVICE_URL=http://127.0.0.1:3001
NEWS_SERVICE_URL=http://127.0.0.1:3002
SEARCH_SERVICE_URL=http://127.0.0.1:3005
AGENT_CONFIG_SERVICE_URL=http://127.0.0.1:3003
SKILL_CONFIG_SERVICE_URL=http://127.0.0.1:3004

LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://your-provider.example/v1
LLM_API_KEY=your-key
LLM_MODEL=your-model
LLM_JSON_MODE=false

AI_CONTENT_MODEL=openai-compatible
AI_REVIEW_MODEL=openai-compatible
AI_CONTENT_JSON_MODE=false
AI_REVIEW_JSON_MODE=false
```

不要把真实密钥提交到仓库。

## 前端生产配置

```env
VITE_API_BASE_URL=/api
```

## PM2 部署

```bash
cd /root/coregist-news
git fetch origin
git pull --ff-only origin main

cd backend
npm install --omit=dev

pm2 restart coregist-gateway --update-env
pm2 restart coregist-user --update-env
pm2 restart coregist-news-service --update-env
pm2 restart coregist-search-service --update-env
pm2 restart coregist-scheduler --update-env
pm2 restart coregist-news-scraper --update-env
pm2 restart coregist-content-processing --update-env
pm2 restart coregist-ai-dispatcher --update-env
pm2 restart coregist-ai-analysis --update-env
pm2 save
```

如果只修改 LLM 配置，通常只需要：

```bash
cd /root/coregist-news/backend
pm2 restart coregist-content-processing coregist-ai-analysis --update-env
pm2 save
```

## Docker Compose 部署

```bash
cd backend
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 gateway
```

## 域名和反向代理

`https://coregist-news.com` 应同时服务前端静态资源和 `/api/*` 反向代理：

```text
/api/* -> http://127.0.0.1:3000/api/*
/*     -> frontend/dist SPA fallback
```

SPA fallback 需要把 `/home`、`/news`、`/profile` 等路径交给前端入口文件处理，不能直接 404。

## 部署后验证

```bash
curl https://coregist-news.com/api/health
curl -i 'https://coregist-news.com/api/news?page=1&limit=1'
curl -i 'https://coregist-news.com/api/search/public-health'
```

未登录新闻 API 返回 401 是正常安全行为。登录后在浏览器访问 `/home` 和 `/news` 应能看到数据。

## 回滚

```bash
cd /root/coregist-news
git log --oneline -5
git checkout <previous-commit>
cd backend
pm2 restart all --update-env
```

回滚前确认不要覆盖生产 `.env` 和数据库数据。
