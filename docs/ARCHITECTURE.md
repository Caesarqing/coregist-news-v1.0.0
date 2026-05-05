# CoreGist News 系统架构

最后更新：2026-05-05

## 总览

CoreGist News 由一个 React 前端、一个 Node.js API Gateway、多个 Node.js 在线业务服务、多个 Python 后台流水线服务，以及 MongoDB / RabbitMQ / Redis 组成。

```text
Browser
  -> Frontend
  -> Gateway /api/*
  -> User / News / Search / Agent Config / Skill Config services

Scheduler / manual trigger
  -> RabbitMQ
  -> News Scraper
  -> Content Processing
  -> AI Dispatcher
  -> AI Analysis
  -> MongoDB
  -> Search / News API
```

## 目录边界

```text
frontend/                 React + Vite 客户端
backend/gateway/          API 网关
backend/services/         微服务和后台 worker
backend/services/shared/  Node / Python 共享运行时代码
backend/pipeline/         抓取、解析、兼容任务入口
backend/ai/               文件化 agents / skills
packages/contracts/       API 契约
packages/design-tokens/   设计 token
docs/                     当前有效文档
```

## 在线 API 层

| 服务 | 端口 | 职责 |
| --- | --- | --- |
| Gateway | 3000 | 唯一公开 API 入口，鉴权并转发请求 |
| User Service | 3001 | 登录、注册、用户信息、追踪主题、设置 |
| News Service | 3002 | 新闻列表、详情、状态更新 |
| Agent Config Service | 3003 | Agent 配置管理 |
| Skill Config Service | 3004 | Skill 配置管理 |
| Search Service | 3005 | 搜索、专题聚合、AI 搜索入口 |

Gateway 公开路径：

- `/api/health`: 健康检查，不需要登录。
- `/api/auth/*`: 登录、注册、刷新 token。
- `/api/user/*`、`/api/users/*`、`/api/tracking/*`: 用户域。
- `/api/news/*`、`/api/search/*`、`/api/news/search/*`、`/api/ai-search/*`: 需要 JWT。
- `/api/agents/*`、`/api/skills/*`: 需要 JWT。

## 后台新闻流水线

| 服务 | 职责 |
| --- | --- |
| Scheduler | 周期性发布抓取和关键词搜索任务 |
| News Scraper | 抓 RSS、页面内容和来源元数据 |
| Content Processing | 清洗正文、分类、标准化为 raw news |
| AI Dispatcher | 分发 AI 分析任务 |
| AI Analysis | 摘要、偏见检测、评分、最终入库 |
| Notification | 消费通知任务并投递 |

核心队列：

- `news_crawl_trigger_queue`
- `news_raw_queue`
- `ai_tasks_queue`
- `notification_queue`

## 数据存储

MongoDB 是主存储，主要集合包括：

- 用户、认证和设置。
- 追踪主题和推送设置。
- 抓取来源、发现记录、raw news。
- AI 分析结果和最终新闻记录。
- Agent / Skill 配置。

RabbitMQ 负责 worker 解耦和重试。Redis 当前作为缓存基础设施保留。

## 认证模型

前端路由由 `ProtectedRoute` 保护；后端业务 API 由 Gateway 校验 Bearer JWT。用户即使直接访问 `/home` 或 `/news`，也会被前端重定向到登录页；直接调用新闻 API 会返回 `401 Unauthorized`。

详见 [AUTH.md](AUTH.md)。

## LLM 模型抽象

Python worker 统一通过 `backend/services/shared/python/llm.py` 调用模型。当前支持：

- `openai-compatible`: `/chat/completions` 兼容接口，覆盖大多数云模型网关、自托管 vLLM / SGLang / TGI、Ollama `/v1`。
- `anthropic`: Anthropic `/v1/messages`。
- `mock`: 本地调试占位。

详见 [LLM.md](LLM.md)。
