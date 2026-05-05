# CoreGist News 路由对照表

更新时间：2026-04-10

## 目的

这份文档用于冻结当前主线架构，并明确：

- 前端真实应该连接哪条后端链路
- `backend/legacy/server.js` 的旧单体能力是否已被微服务覆盖
- 后续新增接口应该加到哪里，而不是误加回旧单体

当前推荐主线始终是：

`frontend -> gateway -> user-service / news-service`

`backend/legacy/server.js` 只作为回滚和兼容入口，不再承接新功能。

## 总览

| 领域 | Gateway | 微服务承接 | Legacy 状态 | 结论 |
|---|---|---|---|---|
| 健康检查 | `/api/health` | `gateway/app.js` + 下游 `/health` | 有 | 主线走 Gateway |
| 认证 | `/api/auth/*` | `user-service` | 有 | 微服务已覆盖 |
| 用户资料/设置 | `/api/user/*` | `user-service` | 有 | 微服务已覆盖 |
| 定向追踪 | `/api/tracking/*` | `user-service` | 有 | 微服务已覆盖 |
| 新闻列表/详情/搜索 | `/api/news/*` | `news-service` | 有 | 微服务已覆盖 |
| AI 搜索 | `/api/ai-search` | `news-service` | 有 | 微服务已覆盖 |
| Agent 配置 | `/api/agents/*` | `agent-config-service` | 无 | 只存在微服务链路 |
| Skill 配置 | `/api/skills/*` | `skill-config-service` | 无 | 只存在微服务链路 |

## Gateway 转发表

来源文件：
- [app.js](/Users/qingpeng/全公司项目/7-人工智能/新闻AI项目/coregist-news/backend/gateway/app.js)

| Gateway 路由 | 转发目标 |
|---|---|
| `/api/auth/*` | `user-service /auth/*` |
| `/api/user/*` | `user-service /user/*` |
| `/api/users/*` | `user-service /user/*` |
| `/api/tracking/*` | `user-service /tracking/*` |
| `/api/news/*` | `news-service /news/*` |
| `/api/ai-search` | `news-service /ai-search` |
| `/api/agents/*` | `agent-config-service /agents/*` |
| `/api/skills/*` | `skill-config-service /skills/*` |

## 详细对照

### 1. 健康检查

| 旧单体 | Gateway / 微服务 | 当前归属 |
|---|---|---|
| `GET /api/health` | `GET /api/health` -> Gateway 汇总 `user-service/news-service/agent-config-service/skill-config-service` | Gateway |

说明：
- Legacy 仍有自己的 `/api/health`
- 但当前真正有价值的健康检查是 Gateway 聚合后的结果

### 2. 认证

来源文件：
- Legacy: [server.js](/Users/qingpeng/全公司项目/7-人工智能/新闻AI项目/coregist-news/backend/legacy/server.js)
- 微服务路由: [auth.routes.js](/Users/qingpeng/全公司项目/7-人工智能/新闻AI项目/coregist-news/backend/services/user-service/routes/auth.routes.js)

| 旧单体路由 | 微服务路由 | 状态 |
|---|---|---|
| `GET /api/auth/check-username` | `GET /auth/check-username` | 已覆盖 |
| `POST /api/auth/register` | `POST /auth/register` | 已覆盖 |
| `POST /api/auth/login` | `POST /auth/login` | 已覆盖 |
| `POST /api/auth/refresh` | `POST /auth/refresh` | 已覆盖 |
| `POST /api/auth/send-reset-code` | `POST /auth/send-reset-code` | 已覆盖 |
| `POST /api/auth/reset-password` | `POST /auth/reset-password` | 已覆盖 |
| `POST /api/auth/google` | `POST /auth/google` | 已覆盖 |
| `GET /api/auth/me` | `GET /auth/me` | 已覆盖 |
| `POST /api/auth/change-password` | `POST /auth/change-password` | 已覆盖 |

### 3. 用户资料与设置

来源文件：
- 微服务路由: [user.routes.js](/Users/qingpeng/全公司项目/7-人工智能/新闻AI项目/coregist-news/backend/services/user-service/routes/user.routes.js)

| 旧单体路由 | 微服务路由 | 状态 |
|---|---|---|
| `PUT /api/user/profile` | `PUT /user/profile` | 已覆盖 |
| `GET /api/user/settings` | `GET /user/settings` | 已覆盖 |
| `PUT /api/user/settings` | `PUT /user/settings` | 已覆盖 |

### 4. 定向追踪

来源文件：
- 微服务路由: [tracking.routes.js](/Users/qingpeng/全公司项目/7-人工智能/新闻AI项目/coregist-news/backend/services/user-service/routes/tracking.routes.js)

| 旧单体路由 | 微服务路由 | 状态 |
|---|---|---|
| `GET /api/tracking/topics` | `GET /tracking/topics` | 已覆盖 |
| `POST /api/tracking/topics` | `POST /tracking/topics` | 已覆盖 |
| `DELETE /api/tracking/topics/:id` | `DELETE /tracking/topics/:id` | 已覆盖 |
| `GET /api/tracking/topics/:id/news` | `GET /tracking/topics/:id/news` | 已覆盖 |
| `GET /api/tracking/analytics` | `GET /tracking/analytics` | 已覆盖 |

### 5. 新闻

来源文件：
- 微服务路由: [news.routes.js](/Users/qingpeng/全公司项目/7-人工智能/新闻AI项目/coregist-news/backend/services/news-service/routes/news.routes.js)

| 旧单体路由 | 微服务路由 | 状态 |
|---|---|---|
| `GET /api/news` | `GET /news` | 已覆盖 |
| `GET /api/news/search` | `GET /news/search` | 已覆盖 |
| `GET /api/news/:id` | `GET /news/:id` | 已覆盖 |
| `POST /api/news/:id/state` | `POST /news/:id/state` | 已覆盖 |
| `POST /api/news` | `POST /news` | 已覆盖 |

### 6. AI 搜索

`news-service` 中旧的 Node.js 模型问答接口已移除。当前 `/api/ai-search` 由 search-service 的统一搜索路径承接，不再维护 `news-service/controllers/ai.controller.js`。

### 7. Agent / Skill 配置

| 旧单体 | 微服务 | 状态 |
|---|---|---|
| 无 | `/api/agents/*` -> `agent-config-service` | 仅微服务存在 |
| 无 | `/api/skills/*` -> `skill-config-service` | 仅微服务存在 |

## 当前结论

### 已可以明确停止向旧单体新增功能的领域

- 认证
- 用户资料
- 用户设置
- 定向追踪
- 新闻列表/详情/搜索
- AI 搜索

### 旧单体保留的唯一合理用途

- 回滚
- 对照排障
- 历史兼容

### 后续新增功能的放置原则

1. 用户、资料、设置、追踪相关：放进 `user-service`
2. 新闻列表、详情、搜索、AI 搜索相关：放进 `news-service`
3. Agent/Skill 配置：放进对应 Python 配置服务
4. 不再把任何新业务逻辑放进 `backend/legacy/server.js`
