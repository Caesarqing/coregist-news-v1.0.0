# CoreGist News

最后更新：2026-05-14

CoreGist News 是一个 AI 新闻聚合、搜索、分析和推送平台。当前代码库已收敛到 Gateway + 业务微服务 + Python 新闻流水线架构，不再保留外部 Agent / Skill 配置平台或 legacy server 入口。

## 当前架构

```text
Browser
  -> Frontend
  -> Gateway /api/*
  -> User / News / Search services

Scheduler / manual trigger
  -> RabbitMQ
  -> News Scraper
  -> Content Processing
  -> AI Dispatcher
  -> AI Analysis
  -> MongoDB
  -> News / Search API
```

核心目录：

- `frontend/`: React 18 + TypeScript + Vite Web 客户端。
- `backend/gateway/`: 唯一 HTTP API 网关。
- `backend/services/`: Node.js 在线服务和 Python 后台 worker。
- `backend/services/shared/`: Node / Python 共享运行时代码。
- `backend/pipeline/`: 抓取、解析和 RSS 来源工具。
- `packages/contracts/`: 前后端共享 DTO、路径常量和类型定义。

服务端口：

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| Frontend | 5173 | Vite 开发服务器 |
| Gateway | 3000 | API 网关，唯一公开入口 |
| User Service | 3001 | 用户、认证、设置、追踪主题 |
| News Service | 3002 | 新闻查询和详情 |
| Search Service | 3005 | 搜索、聚合和 AI 搜索入口 |
| MongoDB | 27017 | 主数据库 |
| RabbitMQ | 5672 | 消息队列 |
| Redis | 6379 | 缓存基础设施 |

## 快速开始

安装依赖后启动完整开发环境：

```bash
npm run dev
```

常用命令：

```bash
npm run dev
npm run build
npm run check:backend
npm --prefix frontend run build
npm --prefix backend run check
```

保留的维护脚本：

```bash
bash backend/scripts/start-local-backend.sh
bash backend/scripts/stop-local-backend.sh
bash backend/scripts/check-services.sh
python backend/scripts/check-push-health.py
python backend/scripts/repair-news-pipeline.py --help
python backend/scripts/repair-news-localization.py --help
node backend/scripts/setAdmin.js <email>
node backend/scripts/test-mongodb-connection.js
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

## 前端

技术栈：

- React 18
- TypeScript
- Vite
- React Router v6
- Tailwind CSS
- shadcn/ui
- Firebase Auth

目录结构：

```text
frontend/src/app/       应用入口、路由和 providers
frontend/src/api/       API client
frontend/src/config/    Firebase 等配置
frontend/src/contexts/  全局上下文
frontend/src/pages/     页面
frontend/src/shared/    共享组件、布局、UI 和 i18n
frontend/src/styles/    全局样式
frontend/src/types/     类型声明
frontend/src/utils/     工具函数
```

前端统一通过同源 `/api` 访问 Gateway。生产环境不要直接把前端指向内部微服务端口。

推荐生产配置：

```env
VITE_API_BASE_URL=/api
```

公开路由：

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/privacy`
- `/terms`

受保护路由：

- `/home`
- `/home/news-push`
- `/home/news-push/:id`
- `/home/news-push/:id/news`
- `/home/news-data`
- `/home/news-data/:id`
- `/home/news-data/my-space`
- `/home/news-data/my-space/:id`
- `/home/targeted-tracking`
- `/home/targeted-tracking/:id`
- `/news`
- `/news/:id`
- `/profile`
- `/profile/general`
- `/profile/notification`
- `/profile/privacy`
- `/profile/edit-profile`
- `/profile/help`

## 后端

在线 API：

- `backend/gateway/app.js`
- `backend/services/user-service/app.js`
- `backend/services/news-service/app.js`
- `backend/services/search-service/app.js`

离线 worker：

- `backend/services/scheduler/app.py`
- `backend/services/news_scraper/app.py`
- `backend/services/content_processing/app.py`
- `backend/services/ai_dispatcher/app.py`
- `backend/services/ai_analysis/app.py`
- `backend/services/notification/app.py`

共享运行时：

- `backend/services/shared/node/`: Node.js 配置、鉴权、队列、新闻展示 helper。
- `backend/services/shared/python/settings.py`: `.env` 读取和服务配置。
- `backend/services/shared/python/queue.py`: RabbitMQ 队列封装和队列名常量。
- `backend/services/shared/python/llm.py`: OpenAI-compatible / Anthropic / mock 通用 LLM provider。
- `backend/services/shared/python/agent_runtime.py`: 内部 prompt 和 skill helper，不对外暴露配置 API。
- `backend/services/shared/python/repositories/`: MongoDB repository 封装。

代码边界：

- 用户域代码放在 `services/user-service/`。
- 新闻查询代码放在 `services/news-service/`。
- 搜索聚合代码放在 `services/search-service/`。
- Python worker 优先从 `services/shared/python/` 导入共享能力。
- 不再新增 legacy 入口；前端访问后端统一走 Gateway `/api/*`。

## API 与认证

认证链路：

```text
Frontend Login/Register
  -> /api/auth/*
  -> User Service
  -> JWT access token / refresh token
  -> Frontend stores auth state
  -> ProtectedRoute protects app pages
  -> Gateway verifies Bearer token for business APIs
```

Gateway 公开路径：

- `/api/health`: 健康检查，不需要登录。
- `/api/auth/*`: 登录、注册、刷新 token。
- `/api/user/*`、`/api/users/*`、`/api/tracking/*`: 用户域。
- `/api/news/*`、`/api/search/*`、`/api/news/search/*`、`/api/ai-search/*`: 需要 JWT。

未携带合法 Bearer token 时返回：

```json
{"error":"Unauthorized"}
```

Firebase 兼容登录：

```env
FIREBASE_PROJECT_ID=coregistnews-news
ALLOW_UNVERIFIED_FIREBASE_TOKENS=false
```

生产环境必须保持 `ALLOW_UNVERIFIED_FIREBASE_TOKENS=false`，并配置强随机值：

```env
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```

## 新闻流水线

目标链路：

```text
Scheduler or manual trigger
  -> news_crawl_trigger_queue
  -> News Scraper
  -> news_raw_queue
  -> Content Processing
  -> ai_tasks_queue
  -> AI Analysis
  -> MongoDB final news
  -> Search Service / News Service
  -> Frontend
```

后台服务职责：

| 服务 | 职责 |
| --- | --- |
| Scheduler | 周期性发布抓取和关键词搜索任务 |
| News Scraper | 抓 RSS、页面内容和来源元数据 |
| Content Processing | 清洗正文、分类、标准化为 raw news |
| AI Dispatcher | 分发 AI 分析任务 |
| AI Analysis | 摘要、分类复核、偏向/事实/情绪复核、最终入库 |
| Notification | 消费通知任务并投递 |

核心队列：

- `news_crawl_trigger_queue`
- `news_raw_queue`
- `ai_tasks_queue`
- `notification_queue`

手动触发 RSS 抓取：

```bash
cd /root/coregist-news/backend

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

推荐生产调度配置：

```env
SCHEDULER_INTERVAL_MINUTES=5
RSS_SOURCE_BATCH_SIZE=8
RSS_SOURCE_MIN_INTERVAL_SECONDS=900
RSS_DOMAIN_MIN_INTERVAL_SECONDS=300
RSS_SOURCE_ERROR_BACKOFF_SECONDS=1800
```

## LLM 配置

Python worker 统一通过 `backend/services/shared/python/llm.py` 调用模型。支持：

- `openai-compatible`: `/chat/completions` 兼容接口，适用于 OpenAI、兼容网关、自托管 vLLM / SGLang / TGI、Ollama `/v1` 等。
- `anthropic`: Anthropic `/v1/messages`。
- `mock`: 本地调试占位。

通用配置：

```env
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

可选参数：

```env
LLM_TOKEN_FIELD=max_tokens
LLM_TOP_P=
LLM_FREQUENCY_PENALTY=
LLM_PRESENCE_PENALTY=
LLM_SYSTEM_PROMPT=
LLM_EXTRA_BODY_JSON=
```

如果需要单独覆盖内容模型和复核模型：

```env
AI_CONTENT_MODEL=openai-compatible
AI_CONTENT_LLM_MODEL=fast-content-model
AI_CONTENT_BASE_URL=https://content-provider.example/v1
AI_CONTENT_API_KEY=content-key

AI_REVIEW_MODEL=openai-compatible
AI_REVIEW_LLM_MODEL=strong-review-model
AI_REVIEW_BASE_URL=https://review-provider.example/v1
AI_REVIEW_API_KEY=review-key
```

配置检查：

```bash
cd /root/coregist-news/backend

python3 - <<'PY'
from services.shared.python.settings import settings
print("provider:", settings.llm_provider)
print("base_url:", settings.llm_base_url)
print("model:", settings.llm_model)
print("content model:", settings.ai_content_model)
print("review model:", settings.ai_review_model)
print("json mode:", settings.llm_json_mode)
PY
```

## 部署

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
SEARCH_SERVICE_PORT=3005

USER_SERVICE_URL=http://127.0.0.1:3001
NEWS_SERVICE_URL=http://127.0.0.1:3002
SEARCH_SERVICE_URL=http://127.0.0.1:3005

LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://your-provider.example/v1
LLM_API_KEY=your-key
LLM_MODEL=your-model
LLM_JSON_MODE=false
```

PM2 部署：

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

反向代理：

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

未登录新闻 API 返回 401 是正常安全行为。登录后在浏览器访问 `/home` 和 `/news` 应能看到数据。

## 运维排查

常用状态命令：

```bash
pm2 list
pm2 logs coregist-gateway --lines 80 --nostream
pm2 logs coregist-user --lines 80 --nostream
pm2 logs coregist-news-service --lines 80 --nostream
pm2 logs coregist-search-service --lines 80 --nostream
pm2 logs coregist-scheduler --lines 80 --nostream
pm2 logs coregist-news-scraper --lines 80 --nostream
pm2 logs coregist-content-processing --lines 80 --nostream
pm2 logs coregist-ai-dispatcher --lines 80 --nostream
pm2 logs coregist-ai-analysis --lines 120 --nostream
```

新闻不更新时按顺序检查：

1. `pm2 list` 确认 worker 在线。
2. RabbitMQ 是否监听 `5672`。
3. Scheduler 是否持续报错。
4. News Scraper 是否只是在某些来源上 401 / 403。
5. Content Processing / AI Analysis 是否连续 `LLM invoke failed`。
6. MongoDB 是否可连接。
7. 手动发布一次 RSS 触发任务。

登录后没有新闻时先区分鉴权和数据问题：

```bash
curl -i 'https://coregist-news.com/api/news?page=1&limit=1'
```

未带 token 返回 401 是正常的。登录后浏览器仍无数据时，检查 `/api/news` 是否 200、access token 是否随请求发送、News/Search Service 日志，以及最终新闻集合是否有最近入库记录。

如果任何真实密钥已经出现在聊天、文档或提交历史里，应轮换：

- MongoDB 用户密码。
- `JWT_SECRET` / `JWT_REFRESH_SECRET`。
- LLM API key。
- Firebase / OAuth 相关密钥。

## 共享包

`@coregist/contracts` 用于沉淀前后端共同依赖的 DTO、路径常量和类型定义，范围包括 Auth、User/Profile/Settings、News、Tracking、AI Search 和 API path constants。当前前端仍存在部分本地类型，新增或修改 API 时应逐步迁移到本包。

## 本地生成物

以下目录是本地依赖、构建产物或运行时缓存，不属于源码精简范围，可按需删除后重装或重新生成：

- `.venv/`
- `node_modules/`
- `backend/node_modules/`
- `frontend/node_modules/`
- `frontend/dist/`
- `backend/.runtime/`

## Attributions

This project uses components from [shadcn/ui](https://ui.shadcn.com/) under the [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

Some original design assets referenced Unsplash photos under the [Unsplash license](https://unsplash.com/license).

## 文档维护规则

- 根 `README.md` 是唯一长期项目文档入口。
- 新增功能优先更新本文件，不再新增一次性“修复完成报告”或重复指南。
- 临时排查记录应进入 issue、PR 或运维日志，确认长期有效后再整理进本文件。
- 不在文档中写入真实密钥、数据库密码、JWT secret 或第三方 token。

## License

[LICENSE](LICENSE)
