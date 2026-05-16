# CoreGist News

<p align="center">
  <img src="docs/assets/coregist-logo-512.png" alt="CoreGist News Logo" width="160" height="160">
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a>
</p>

CoreGist News 是一个采用 GPLv3 许可证的 AI 新闻应用，适用于学习、学术研究和教育演示。系统由 React 前端、Node.js API 服务、Python 新闻处理 worker、MongoDB、RabbitMQ 和大模型服务组成，用于新闻抓取、正文清洗、摘要生成、搜索和个性化新闻推送。

<img src="docs/assets/news-showcase.png" alt="CoreGist News 新闻展示" width="100%">

## 目录

- [功能概览](#功能概览)
- [运行前依赖](#运行前依赖)
- [下载与安装](#下载与安装)
- [项目结构](#项目结构)
- [服务与端口](#服务与端口)
- [环境配置](#环境配置)
- [新闻处理管线](#新闻处理管线)
- [API 与认证](#api-与认证)
- [部署](#部署)
- [运维检查](#运维检查)
- [免责声明与合规声明](#免责声明与合规声明)
- [许可证](#许可证)

## 功能概览

- 新闻聚合：从 RSS 和关键词任务抓取新闻。
- 内容处理：清洗正文、标准化来源、过滤低质内容并写入队列。
- AI 分析：生成标题、摘要、标签、分类、偏向复核、事实复核和情绪信号。
- 搜索体验：支持普通新闻搜索、AI 搜索、追踪主题和个性化推送批次。
- 统一入口：前端通过 Gateway 的 `/api/*` 访问后端服务，便于部署和鉴权。

## 运行前依赖

- Node.js 18+
- Python 3.10+
- MongoDB
- RabbitMQ
- Redis，可选，用于缓存相关流程
- OpenAI-compatible、Anthropic 或 mock 大模型 provider

## 下载与安装

克隆仓库：

```bash
git clone https://github.com/Caesarqing/coregist-news-v1.0.0.git
cd coregist-news-v1.0.0
```

安装依赖：

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

创建后端环境变量文件：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，至少填写 MongoDB、JWT、RabbitMQ 和 LLM 配置。启动本地开发环境：

```bash
npm run dev
```

运行检查：

```bash
npm run check:backend
npm --prefix frontend run build
```

健康检查：

```bash
curl http://localhost:3000/api/health
```

## 项目结构

```text
coregist-news-v1.0.0/
├── README.md                       英文项目说明
├── README.zh-CN.md                 中文项目说明
├── LICENSE                         GNU GPLv3 许可证
├── package.json                    根目录脚本
├── backend/
│   ├── .env.example                统一后端环境变量模板
│   ├── docker-compose.yml          本地基础设施和服务编排
│   ├── gateway/                    API Gateway 与请求转发
│   ├── services/
│   │   ├── user-service/           用户、认证、设置、追踪主题
│   │   ├── news-service/           新闻列表、详情、分类和展示 API
│   │   ├── search-service/         搜索、AI 搜索和聚合 API
│   │   ├── news_scraper/           RSS 和关键词抓取 worker
│   │   ├── content_processing/     正文清洗、质量检查、分类
│   │   ├── ai_dispatcher/          AI 任务分发 worker
│   │   ├── ai_analysis/            摘要、复核、标签和最终入库
│   │   ├── notification/           通知投递 worker
│   │   └── shared/                 Node.js 与 Python 共享运行时
│   └── scripts/                    本地启动、诊断和修复脚本
├── frontend/
│   ├── public/                     静态图标和公共资源
│   └── src/                        React 应用源码
├── packages/
│   └── contracts/                  共享 DTO、API 路径和 TypeScript 类型
└── docs/
    └── assets/                     README 图片和文档资源
```

目录说明：

- `frontend/src/app/`：应用启动、路由和 providers。
- `frontend/src/pages/`：用户可见页面。
- `backend/gateway/app.js`：唯一公开 API 入口。
- Python worker 优先复用 `backend/services/shared/python/`。
- Node 服务优先复用 `backend/services/shared/node/`。
- 对外 API 类型或路径变化时，应同步更新 `packages/contracts/`。

## 服务与端口

| 服务 | 默认端口 | 环境变量 |
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

唯一维护的后端环境变量模板是 [backend/.env.example](backend/.env.example)。复制为 `backend/.env` 后替换占位值。

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

安全要求：

- `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 必须使用强随机字符串。
- 生产环境保持 `ALLOW_UNVERIFIED_FIREBASE_TOKENS=false`。
- 不提交真实 `.env`、API key、数据库凭据、JWT secret 或第三方 token。
- 如果密钥出现在聊天记录、shell history、应用日志或 Git 历史中，应立即轮换。

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

- 新闻以 `postedAt` 排序，越新的新闻越靠前。
- 首页默认聚焦近期新闻。
- 搜索可以覆盖更宽的历史范围。
- 文章页连续出现 `403` 或 `429` 的来源会进入退避或隔离，避免爬虫空转和内存压力。

## API 与认证

```text
Frontend login/register
  -> /api/auth/*
  -> User Service
  -> JWT access token / refresh token
  -> Gateway verifies Bearer token
  -> Protected APIs
```

| 路径 | 是否需要登录 | 说明 |
| --- | --- | --- |
| `/api/health` | 否 | Gateway 和服务健康检查 |
| `/api/auth/*` | 否 | 登录、注册、刷新 token |
| `/api/user/*` | 是 | 用户设置和资料 |
| `/api/users/*` | 是 | 用户兼容 API |
| `/api/tracking/*` | 是 | 追踪主题和推送 |
| `/api/news/*` | 是 | 新闻列表、详情和分类 |
| `/api/search/*` | 是 | 搜索 API |
| `/api/ai-search/*` | 是 | AI 搜索 API |

未授权请求返回：

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

部署后检查：

```bash
curl https://coregist-news.com/api/health
curl -i 'https://coregist-news.com/api/news?page=1&limit=1'
curl -i 'https://coregist-news.com/api/search/public-health'
```

未登录访问新闻 API 返回 `401` 是正常行为。登录后应确认浏览器请求带有 Bearer token，且 Gateway 转发正常。

## 运维检查

常用诊断命令：

```bash
pm2 list
pm2 logs coregist-gateway --lines 80 --nostream
pm2 logs coregist-news-rss-worker --lines 120 --nostream
pm2 logs coregist-content-processing --lines 120 --nostream
pm2 logs coregist-ai-analysis --lines 120 --nostream
rabbitmqctl list_queues name messages messages_ready messages_unacknowledged
```

新闻不更新时：

1. 确认 Gateway、News Service、RSS worker、Content Processing、AI Analysis 在线。
2. 检查 RabbitMQ 队列是否积压。
3. 检查爬虫日志是否反复出现 `403`、`429` 或 timeout。
4. 检查 AI 日志是否出现 LLM `401`、`402`、`429` 或 timeout。
5. 确认 MongoDB 中存在近期 `raw_news` 和 `news` 记录。
6. 确认登录后的浏览器请求 `/api/news` 返回 `200`。

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

## 免责声明与合规声明

### 合规性声明

- 本项目中的所有代码、工具和功能可在 GNU GPLv3 许可范围内用于学习、学术研究、教育和其他合规用途。
- 严禁将本项目用于任何违法、违规、滥用、有害或侵犯他人权益的行为。

### 爬虫功能免责

- 项目中的爬虫功能仅用于技术学习和研究目的。
- 使用者必须遵守目标网站的 `robots.txt` 协议、使用条款、访问政策和相关法律法规。
- 使用者不得进行恶意爬取、过度抓取、绕过访问控制或数据滥用。
- 因使用爬虫功能产生的任何法律后果由使用者自行承担。

### 数据使用免责

- 项目涉及的数据分析功能可用于研究、学习和教育演示。
- 分析结果不构成专业、法律、金融、医疗、投资或合规建议。
- 使用者应确保所采集、处理和分析的数据合法合规。

### 技术免责

- 本项目按“现状”提供，不提供任何明示或暗示的保证。
- 作者不保证项目的准确性、可靠性、可用性、安全性、特定用途适用性或不侵权。
- 作者不对使用本项目造成的任何直接、间接、附带、后果性或其他损失承担责任。

### 责任限制

- 使用者在使用本项目前应充分了解相关法律法规。
- 使用者应确保其使用行为符合当地法律法规、目标网站条款和第三方权益要求。
- 因违法或违规使用本项目而产生的任何后果由使用者自行承担。
- 使用本项目即表示您已阅读、理解、同意并接受上述所有免责声明条款。

## 许可证

本项目采用 **GNU General Public License v3.0**。

- SPDX-License-Identifier: `GPL-3.0-only`
- 你可以在 GPLv3 条款下使用、复制、修改和分发本软件。
- 如果你分发修改版本或衍生作品，必须遵守 GPLv3 关于源码和许可证的义务。

完整许可证文本见 [LICENSE](LICENSE)。
