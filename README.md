# CoreGist News

<img src="docs/assets/coregist-logo-512.png" alt="CoreGist News Logo" width="96" height="96">

CoreGist News 是一个面向新闻聚合、AI 摘要、智能搜索和个性化推送的 Web 应用。系统由 React 前端、Node.js API 微服务、Python 新闻处理管线、MongoDB 和 RabbitMQ 组成，前端统一通过 Gateway 访问后端服务，后台 worker 负责 RSS 抓取、内容清洗、AI 分析和通知投递。

<img src="docs/assets/news-showcase.png" alt="CoreGist News showcase" width="100%">

## 目录

- [功能概览](#功能概览)
- [系统架构](#系统架构)
- [目录结构](#目录结构)
- [服务与端口](#服务与端口)
- [环境配置](#环境配置)
- [本地开发](#本地开发)
- [新闻处理管线](#新闻处理管线)
- [API 与认证](#api-与认证)
- [部署](#部署)
- [运维检查](#运维检查)
- [维护约定](#维护约定)

## 功能概览

- 新闻聚合：从 RSS 和关键词任务抓取新闻，清洗正文并统一入库。
- AI 摘要：生成中英文标题、摘要、标签、分类、事实复核和情绪/偏向分析。
- 搜索体验：支持普通新闻搜索、AI 搜索和用户追踪主题。
- 个性化推送：按用户追踪主题生成批次，沉淀推送结果和推送历史。
- 多端一致：前端通过统一 `/api/*` 入口访问后端，生产环境便于反向代理和鉴权。

## 系统架构

```text
Browser
  -> Frontend
  -> Gateway /api/*
  -> User Service / News Service / Search Service

Scheduler / Manual Trigger
  -> RabbitMQ
  -> News Scraper
  -> Content Processing
  -> AI Dispatcher
  -> AI Analysis
  -> MongoDB
  -> News API / Search API / Notification
```

核心运行组件：

| 组件 | 说明 |
| --- | --- |
| Frontend | React + TypeScript + Vite 前端应用 |
| Gateway | 统一 API 入口，负责鉴权和请求转发 |
| User Service | 用户、登录、设置、追踪主题和推送状态 |
| News Service | 新闻列表、详情、分类和展示过滤 |
| Search Service | 新闻搜索、AI 搜索和聚合查询 |
| Scheduler | 周期性发布 RSS 抓取和关键词任务 |
| News Scraper | 抓取 RSS、文章页和来源元数据 |
| Content Processing | 清洗正文、过滤低质内容、分类和标准化 |
| AI Dispatcher | 将待分析新闻分发给 AI 分析队列 |
| AI Analysis | 摘要、复核、标签、图片兜底和最终入库 |
| Notification | 消费通知任务并投递 |

## 目录结构

```text
frontend/                    React Web 客户端
backend/gateway/             API Gateway
backend/services/            Node.js 服务与 Python worker
backend/services/shared/     Node / Python 共享运行时
backend/scripts/             运维、修复和本地启动脚本
packages/contracts/          前后端共享 DTO、路径常量和类型
docs/assets/                 README 与文档图片资源
```

常用源码入口：

- `frontend/src/app/`: 应用入口、路由和 providers。
- `frontend/src/pages/`: 页面实现。
- `backend/gateway/app.js`: Gateway 服务。
- `backend/services/user-service/app.js`: 用户服务。
- `backend/services/news-service/app.js`: 新闻服务。
- `backend/services/search-service/app.js`: 搜索服务。
- `backend/services/news_scraper/app.py`: 新闻抓取 worker。
- `backend/services/content_processing/app.py`: 内容处理 worker。
- `backend/services/ai_analysis/app.py`: AI 分析 worker。

## 服务与端口

| 服务 | 默认端口 | 配置变量 |
| --- | ---: | --- |
| Frontend | 5173 | `VITE_API_BASE_URL` |
| Gateway | 3000 | `GATEWAY_PORT` |
| User Service | 3001 | `USER_SERVICE_PORT` |
| News Service | 3002 | `NEWS_SERVICE_PORT` |
| Search Service | 3005 | `SEARCH_SERVICE_PORT` |
| MongoDB | 27017 | `MONGODB_URI` |
| RabbitMQ | 5672 | `RABBITMQ_URL` |
| Redis | 6379 | `REDIS_URL` |

生产环境建议只公开 Frontend 和 Gateway，其他服务通过 `127.0.0.1` 或内网访问。

## 环境配置

唯一环境变量模板是 [backend/.env.example](backend/.env.example)。本地或生产部署时复制为 `backend/.env` 后填入真实值，真实 `.env` 不提交。

```bash
cp backend/.env.example backend/.env
```

最小 API 服务配置：

```env
MONGODB_URI=mongodb://127.0.0.1:27017/coregistnews
MONGODB_DB_NAME=coregistnews
JWT_SECRET=change-me
JWT_REFRESH_SECRET=change-me
GATEWAY_PORT=3000
USER_SERVICE_PORT=3001
NEWS_SERVICE_PORT=3002
SEARCH_SERVICE_PORT=3005
USER_SERVICE_URL=http://127.0.0.1:3001
NEWS_SERVICE_URL=http://127.0.0.1:3002
SEARCH_SERVICE_URL=http://127.0.0.1:3005
```

完整新闻管线还需要：

```env
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672/
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

RSS 与队列保护建议：

```env
RSS_SOURCE_BATCH_SIZE=8
RSS_MAX_ITEMS_PER_FEED=2
RSS_BROWSER_TIMEOUT_MS=8000
RSS_HTTP_LIMITED_BACKOFF_SECONDS=21600
RSS_HTTP_LIMITED_QUARANTINE_THRESHOLD=2
RSS_HTTP_LIMITED_QUARANTINE_SECONDS=86400
NEWS_RAW_QUEUE_MAX_MESSAGES=5000
AI_TASKS_QUEUE_MAX_MESSAGES=1000
RSS_SKIP_WHEN_BACKLOGGED=true
```

生产安全要求：

- `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 必须使用强随机字符串。
- `ALLOW_UNVERIFIED_FIREBASE_TOKENS=false`。
- 不在 README、日志、shell history 或 Git 提交中写真实 API key。
- 如密钥曾经暴露，立即轮换 MongoDB、JWT、LLM、Firebase/OAuth 相关密钥。

## 本地开发

安装依赖：

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

启动完整开发环境：

```bash
npm run dev
```

常用命令：

```bash
npm run build
npm run check:backend
npm --prefix frontend run build
npm --prefix backend run check
bash backend/scripts/start-local-backend.sh
bash backend/scripts/stop-local-backend.sh
bash backend/scripts/check-services.sh
```

健康检查：

```bash
curl http://localhost:3000/api/health
```

Docker Compose：

```bash
cd backend
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 gateway
```

## 新闻处理管线

```text
news_crawl_trigger_queue
  -> News Scraper
  -> news_raw_queue
  -> Content Processing
  -> ai_tasks_queue
  -> AI Dispatcher
  -> AI Analysis
  -> MongoDB news
```

核心队列：

| 队列 | 说明 |
| --- | --- |
| `news_crawl_trigger_queue` | 抓取触发任务 |
| `news_raw_queue` | 原始新闻内容 |
| `ai_tasks_queue` | AI 分析任务 |
| `news_notifications_queue` | 通知任务 |

手动触发小批量 RSS 抓取：

```bash
cd backend

python3 - <<'PY'
from services.shared.python.queue import QueueClient, QUEUE_NEWS_CRAWL_TRIGGER
from services.shared.python.settings import settings

QueueClient().publish(QUEUE_NEWS_CRAWL_TRIGGER, {
    "mode": "rss",
    "publish_raw": True,
    "limit_per_feed": min(settings.rss_max_items_per_feed, 2),
    "source_limit": settings.rss_source_batch_size,
    "rotate_sources": True,
})
print("published")
PY
```

默认展示策略：

- 新入库新闻以 `postedAt` 为准排序，越新的新闻越靠前。
- 首页展示聚焦近期新闻，过旧新闻不进入默认展示列表。
- 搜索可以覆盖更宽的历史范围。
- RSS 文章页连续 403 / 429 的来源会进入退避或隔离，避免爬虫空转和内存消耗。

## API 与认证

认证链路：

```text
Frontend Login/Register
  -> /api/auth/*
  -> User Service
  -> JWT access token / refresh token
  -> Gateway verifies Bearer token
  -> Protected business APIs
```

Gateway 路径：

| 路径 | 鉴权 | 说明 |
| --- | --- | --- |
| `/api/health` | 否 | Gateway 和后端服务健康检查 |
| `/api/auth/*` | 否 | 登录、注册、刷新 token |
| `/api/user/*` | 是 | 用户设置和资料 |
| `/api/users/*` | 是 | 用户相关兼容 API |
| `/api/tracking/*` | 是 | 追踪主题和推送 |
| `/api/news/*` | 是 | 新闻列表、详情、分类 |
| `/api/search/*` | 是 | 搜索 API |
| `/api/ai-search/*` | 是 | AI 搜索 API |

未携带合法 Bearer token 时返回：

```json
{"error":"Unauthorized"}
```

## 部署

PM2 部署流程：

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
pm2 restart coregist-news-rss-worker --update-env
pm2 restart coregist-news-keyword-worker --update-env
pm2 restart coregist-content-processing --update-env
pm2 restart coregist-ai-dispatcher --update-env
pm2 restart coregist-ai-analysis --update-env
pm2 restart coregist-notification --update-env
pm2 save
```

反向代理建议：

```text
/api/* -> http://127.0.0.1:3000/api/*
/*     -> frontend/dist SPA fallback
```

部署后验证：

```bash
curl https://coregist-news.com/api/health
curl -i 'https://coregist-news.com/api/news?page=1&limit=1'
curl -i 'https://coregist-news.com/api/search/public-health'
```

未登录访问新闻 API 返回 401 属于正常鉴权行为。登录后页面仍无数据时，优先检查 Gateway 是否转发成功、token 是否随请求发送、`news` 集合是否存在近期数据。

## 运维检查

常用状态命令：

```bash
pm2 list
pm2 logs coregist-gateway --lines 80 --nostream
pm2 logs coregist-news-rss-worker --lines 120 --nostream
pm2 logs coregist-content-processing --lines 120 --nostream
pm2 logs coregist-ai-analysis --lines 120 --nostream
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged
```

新闻不更新时按顺序检查：

1. `pm2 list` 确认 Gateway、News Service、RSS worker、Content Processing、AI Analysis 在线。
2. `rabbitmqctl list_queues` 确认队列没有大量积压。
3. News Scraper 日志是否大量出现 403 / 429 / timeout。
4. Content Processing / AI Analysis 是否出现 LLM 401 / 402 / 429 / timeout。
5. MongoDB 中 `raw_news` 是否产生新记录，`news` 是否有 72 小时内记录。
6. 登录后浏览器请求 `/api/news` 是否带 Bearer token 且返回 200。

查看最新入库新闻：

```bash
cd backend

python3 - <<'PY'
import os
from pymongo import MongoClient

client = MongoClient(os.environ["MONGODB_URI"])
db = client[os.environ.get("MONGODB_DB_NAME", "coregistnews")]
row = db.news.find_one(
    {},
    {"_id": 0, "title_zh": 1, "summary_zh": 1, "postedAt": 1, "processed_at": 1, "source_en": 1},
    sort=[("postedAt", -1)],
)
print(row)
client.close()
PY
```

## 维护约定

- 根 `README.md` 是长期项目说明入口。
- 环境变量说明只维护 `backend/.env.example`。
- 新增 API 时优先同步 `packages/contracts/`。
- 前端访问后端统一走 Gateway `/api/*`。
- Python worker 共享能力优先放在 `backend/services/shared/python/`。
- Node 服务共享能力优先放在 `backend/services/shared/node/`。
- 不提交 `.env`、运行时缓存、构建产物或真实密钥。

## License

[LICENSE](LICENSE)
